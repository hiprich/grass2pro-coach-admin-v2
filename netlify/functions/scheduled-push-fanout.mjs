// Scheduled Web Push fan-out for parent reminders.
//
// Runs every 5 minutes (see netlify.toml). On each tick we:
//   1. List Sessions whose start- or end-time is approaching one of five
//      windows:
//        - One Hour Reminder:        now in [start - 65min, start - 55min]
//        - Check In Open:            now in [start - 35min, start - 25min]
//        - Pickup Soon:              now in [end   - 35min, end   - 25min]
//        - Pickup Confirm Reminder:  now in [end   + 10min, end   + 20min]
//                                    (only parents with open attendance row)
//        - Pickup Confirm Final:     now in [end   + 25min, end   + 35min]
//                                    (only parents with open attendance row)
//      The 10-min window (\u00b15 min) absorbs cron jitter and handles a
//      missed/late tick without sending duplicates.
//   2. For each candidate (session, kind), find the parents of children
//      attending that session.
//   3. For each parent, find their active push subscriptions whose matching
//      pref toggle is ON.
//   4. Dedupe against the Notifications Sent table on
//      `<sessionId>:<kind>:<parentId>`. We write the row BEFORE the send so
//      a duplicate cron tick within the same window cannot double-send.
//   5. Send the web-push payload using `web-push`. Title is per-coach
//      (Phase 2f): `<coach name> \u2014 <team>` when available, falling back
//      to "Grass2Pro" if neither is on the row.
//
// Free-plan limit: 10s per invocation. With ~3 coaches \u00d7 ~30 parents in the
// near term, the total Airtable + web-push work is ~50 HTTP calls in the
// worst case \u2014 well under budget.
//
// Failure handling: a single bad endpoint should not abort the whole tick.
// Each send is wrapped in try/catch and the per-row Notifications Sent
// status is set to "Sent", "Failed", or "Skipped" so we can audit later.
import webpush from "web-push";

import {
  TABLE_IDS,
  airtableCreate,
  airtableDelete,
  airtableGet,
  airtableList,
  airtableUpdate,
  hasAirtableConfig,
  tableName,
} from "./_airtable.mjs";
import { sendNoShowCheckInEmail } from "./_noshow-mailer.mjs";

// ----- Constants -----

// Push kinds. Strings match the singleSelect choices in Airtable so we can
// write them straight into the Kind field without a mapping table.
const KIND_ONE_HOUR = "One Hour Reminder";
const KIND_CHECK_IN = "Check In Open";
const KIND_PICKUP = "Pickup Soon";
// Phase A4: forgotten-departure nags. These fire AFTER the session ends and
// are scoped to parents whose child still has an open attendance row (arrival
// recorded but no departure). The reminder lands 15 min after end; the final
// nudge lands 30 min after end, by which point the OnPitchCard goes amber and
// the coach can tap-out as a backup.
const KIND_PICKUP_REMINDER = "Pickup Confirm Reminder";
const KIND_PICKUP_FINAL = "Pickup Confirm Final";
// No-show check-in: fires 30 min after end for parents who RSVP'd "Coming"
// but whose child has no Arrival Time. Tone is a warm check-in, not a chase
// — "hey, didn't see you at training, everything okay?". Channel is push +
// Resend email fallback so we still reach parents who haven't subscribed to
// push yet.
const KIND_NO_SHOW = "No Show Check-In";

// Pref-field name on the Push Subscriptions table for each kind. Used to
// filter which subscriptions should receive a given kind.
const PREF_FIELD_BY_KIND = {
  [KIND_ONE_HOUR]: "Pref One Hour Reminder",
  [KIND_CHECK_IN]: "Pref Check In Open",
  [KIND_PICKUP]: "Pref Pickup Soon",
  [KIND_PICKUP_REMINDER]: "Pref Pickup Confirm Reminder",
  [KIND_PICKUP_FINAL]: "Pref Pickup Confirm Final",
  [KIND_NO_SHOW]: "Pref No Show Check-In",
};

// Window definitions: how many minutes before (positive) or AFTER (negative)
// the relevant edge of the session this kind targets, plus the symmetric
// tolerance around it. Negative offsets are how we express "N minutes after
// the edge" without adding a third axis to the shape.
//
// `requiresOpenAttendance` constrains the fan-out to parents whose child has
// an attendance row with arrivalTime set and departureTime empty for this
// session. Without it, the post-end nags would pester parents whose child
// has already been collected, or who never showed up at all.
const WINDOWS = [
  { kind: KIND_ONE_HOUR, edge: "start", offsetMin: 60, toleranceMin: 5 },
  { kind: KIND_CHECK_IN, edge: "start", offsetMin: 30, toleranceMin: 5 },
  { kind: KIND_PICKUP, edge: "end", offsetMin: 30, toleranceMin: 5 },
  {
    kind: KIND_PICKUP_REMINDER,
    edge: "end",
    offsetMin: -15,
    toleranceMin: 5,
    requiresOpenAttendance: true,
  },
  {
    kind: KIND_PICKUP_FINAL,
    edge: "end",
    offsetMin: -30,
    toleranceMin: 5,
    requiresOpenAttendance: true,
  },
  // No-show check-in: end + 30 min. Filter is RSVP="Coming" AND no
  // Arrival Time. We REUSE the same target window as PICKUP_FINAL
  // (offsetMin: -30) because a kid is either still on the pitch (handled
  // by PICKUP_FINAL via requiresOpenAttendance) or never showed up
  // (handled here via requiresRsvpComingNoArrival). The two filters are
  // mutually exclusive on a given attendance row, so a parent can't get
  // both pings for the same child + session.
  {
    kind: KIND_NO_SHOW,
    edge: "end",
    offsetMin: -30,
    toleranceMin: 5,
    requiresRsvpComingNoArrival: true,
  },
];

// Hard cap on Airtable list size for each table. The free-tier base is
// well under these numbers; raising the cap is harmless.
const PAGE_SIZE = "100";

// ----- Time helpers -----

// Combine an Airtable date (YYYY-MM-DD) with a time string (HH:mm or
// HH:mm:ss) into a UTC Date. Sessions are stored in Europe/London local
// wall-clock; we convert to UTC by treating the wall-clock as a Date
// constructed from the ISO string with a London offset.
//
// We can't trivially derive the London offset for an arbitrary date in
// pure JS without Intl plumbing, so we use Intl.DateTimeFormat to read
// the offset for the candidate timestamp and adjust. This handles BST
// and GMT correctly, including the day a session crosses the DST boundary.
function combineLondonDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const cleanDate = String(dateStr).slice(0, 10); // YYYY-MM-DD
  const cleanTime = String(timeStr).slice(0, 5); // HH:mm
  // Build a tentative UTC instant and then read the London offset for it.
  // Two passes is enough because the London offset only changes by 1h at
  // most, so the offset of (utcGuess) and (utcGuess + offset) differ only
  // across the very specific 01:00\u201302:00 DST window \u2014 which we accept,
  // since session times in that window are vanishingly rare.
  const naive = new Date(`${cleanDate}T${cleanTime}:00Z`);
  if (Number.isNaN(naive.getTime())) return null;
  const offsetMin = londonOffsetMinutes(naive);
  return new Date(naive.getTime() - offsetMin * 60_000);
}

// Returns the number of minutes the London wall-clock is AHEAD of UTC at
// the given UTC instant. BST = +60, GMT = 0.
function londonOffsetMinutes(utcDate) {
  // Intl returns the wall-clock pieces in the target timezone for a given
  // instant. We compare those pieces to the same pieces in UTC.
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(utcDate).map((p) => [p.type, p.value]),
  );
  // Intl uses 24 for midnight in some locales; normalise.
  const hour = parts.hour === "24" ? "00" : parts.hour;
  const londonAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((londonAsUtc - utcDate.getTime()) / 60_000);
}

// True when `now` is within `toleranceMin` of `target`.
function isInWindow(nowMs, targetMs, toleranceMin) {
  return Math.abs(nowMs - targetMs) <= toleranceMin * 60_000;
}

// ----- Airtable lookups -----

function sessionsTable() {
  return tableName("AIRTABLE_SESSIONS_TABLE", "Sessions", TABLE_IDS.SESSIONS);
}
function attendanceTable() {
  return tableName("AIRTABLE_ATTENDANCE_TABLE", "Attendance", TABLE_IDS.ATTENDANCE);
}
function playersTable() {
  return tableName("AIRTABLE_PLAYERS_TABLE", "Players", TABLE_IDS.PLAYERS);
}
function parentsTable() {
  return tableName("AIRTABLE_PARENTS_TABLE", "Parents/Guardians", TABLE_IDS.PARENTS);
}
function pushSubsTable() {
  return tableName(
    "AIRTABLE_PUSH_SUBSCRIPTIONS_TABLE",
    "Push Subscriptions",
    TABLE_IDS.PUSH_SUBSCRIPTIONS,
  );
}
function notificationsSentTable() {
  return tableName(
    "AIRTABLE_NOTIFICATIONS_SENT_TABLE",
    "Notifications Sent",
    TABLE_IDS.NOTIFICATIONS_SENT,
  );
}

// Pull all sessions, then filter to those whose start/end intersects any of
// the three windows. We accept the full-list scan because the table is
// small in our world (a few coaches \u00d7 a few sessions/week).
async function findCandidateSessions(nowMs) {
  const records = await airtableList(sessionsTable(), { pageSize: PAGE_SIZE });
  const candidates = [];
  for (const record of records) {
    const fields = record?.fields || {};
    const date = String(fields.Date || fields["Session Date"] || "");
    const start = String(fields["Start Time"] || fields.Start || "");
    const end = String(fields["End Time"] || fields.End || "");
    if (!date) continue;

    const startAt = combineLondonDateTime(date, start);
    const endAt = combineLondonDateTime(date, end);

    // Skip sessions that are cancelled or completed \u2014 mirroring the
    // dashboard's lock rule. A coach who cancels mid-week shouldn't get a
    // pickup-soon push.
    const status = String(fields.Status || fields.State || "").toLowerCase();
    if (status === "cancelled" || status === "completed") continue;

    for (const window of WINDOWS) {
      const edgeAt = window.edge === "start" ? startAt : endAt;
      if (!edgeAt) continue;
      // Positive offset = N minutes BEFORE the edge (target is earlier);
      // negative offset = N minutes AFTER the edge (target is later).
      const targetMs = edgeAt.getTime() - window.offsetMin * 60_000;
      if (!isInWindow(nowMs, targetMs, window.toleranceMin)) continue;
      candidates.push({
        sessionId: record.id,
        sessionFields: fields,
        kind: window.kind,
        targetAt: new Date(targetMs).toISOString(),
        requiresOpenAttendance: !!window.requiresOpenAttendance,
        requiresRsvpComingNoArrival: !!window.requiresRsvpComingNoArrival,
      });
    }
  }
  return candidates;
}

// Find player record ids (and their attendance row ids when known) attending
// a given session. We use the Attendance table when present (most reliable),
// otherwise fall back to the Players[] link directly on the Session row.
//
// When `requireOpen` is true (Phase A4 pickup-confirm), we narrow further to
// only attendance rows that have an arrivalTime AND no departureTime — i.e.
// the child is still on the pitch. In that mode we DO NOT fall back to the
// Session.Players link, because that fallback can't tell us which players
// have an open attendance row.
//
// When `requireRsvpComingNoArrival` is true (No Show Check-In), we narrow to
// rows where RSVP Status = "Coming" AND Arrival Time is empty. Same fallback
// rule as requireOpen — we never go to the Session.Players list because that
// can't tell us who RSVP'd.
//
// Returns an array of { playerId, attendanceId|null }. Callers that only
// need playerIds can map over .playerId.
async function findPlayerIdsForSession(
  sessionId,
  sessionFields,
  { requireOpen = false, requireRsvpComingNoArrival = false } = {},
) {
  // Prefer attendance rows for this session.
  try {
    const attendance = await airtableList(attendanceTable(), { pageSize: PAGE_SIZE });
    const out = [];
    const seen = new Set();
    for (const row of attendance) {
      const link = Array.isArray(row?.fields?.Session) ? row.fields.Session : [];
      if (!link.includes(sessionId)) continue;
      if (requireOpen) {
        const arrival = row?.fields?.["Arrival Time"];
        const departure = row?.fields?.["Departure Time"];
        if (!arrival || departure) continue;
      }
      if (requireRsvpComingNoArrival) {
        const rsvp = String(row?.fields?.["RSVP Status"] || "");
        const arrival = row?.fields?.["Arrival Time"];
        if (rsvp !== "Coming") continue;
        if (arrival) continue;
        // Don't re-message a parent we've already nagged for this row.
        if (row?.fields?.["Parent Notified"]) continue;
      }
      const playerLink = Array.isArray(row?.fields?.Player) ? row.fields.Player : [];
      for (const id of playerLink) {
        if (seen.has(id)) continue;
        seen.add(id);
        out.push({ playerId: id, attendanceId: row.id, attendanceFields: row.fields || {} });
      }
    }
    if (out.length > 0) return out;
    // No matches — for the constrained modes, return empty rather than
    // falling back to a broader list that could re-surface departed kids
    // or kids who never RSVP'd.
    if (requireOpen || requireRsvpComingNoArrival) return [];
  } catch (error) {
    console.warn("[scheduled-push-fanout] Attendance lookup failed; falling back to Session.Players:", error);
    if (requireOpen || requireRsvpComingNoArrival) return [];
  }
  // Fallback: the Session row's Players link field.
  const fallback = Array.isArray(sessionFields?.Players) ? sessionFields.Players : [];
  return fallback.map((id) => ({ playerId: id, attendanceId: null, attendanceFields: {} }));
}

// Resolve player ids \u2192 unique parent record ids. Players can have multiple
// linked parents; we union them all. Returns a Map<parentId, Set<playerId>>
// so callers (e.g. no-show email) can name the right child for each parent.
async function findParentIdsForPlayers(playerIds) {
  if (playerIds.length === 0) return new Map();
  const players = await airtableList(playersTable(), { pageSize: PAGE_SIZE });
  const wanted = new Set(playerIds);
  const parentToPlayers = new Map();
  for (const record of players) {
    if (!wanted.has(record.id)) continue;
    const fields = record.fields || {};
    const links = fields["Parent/Guardian"] || fields.Parent;
    if (!Array.isArray(links)) continue;
    for (const parentId of links) {
      if (!parentToPlayers.has(parentId)) parentToPlayers.set(parentId, new Set());
      parentToPlayers.get(parentId).add(record.id);
    }
  }
  return parentToPlayers;
}

// Lookup helpers for the no-show email body. Both load the relevant table
// once and cache the results inside the closure so the per-tick caller can
// share state across candidates.
async function findParentEmailsByIds(parentIds) {
  if (parentIds.length === 0) return new Map();
  const records = await airtableList(parentsTable(), { pageSize: PAGE_SIZE });
  const wanted = new Set(parentIds);
  const emails = new Map();
  for (const record of records) {
    if (!wanted.has(record.id)) continue;
    const email = String(record.fields?.Email || "").trim();
    if (email) emails.set(record.id, email);
  }
  return emails;
}

async function findPlayerNamesByIds(playerIds) {
  if (playerIds.length === 0) return new Map();
  const records = await airtableList(playersTable(), { pageSize: PAGE_SIZE });
  const wanted = new Set(playerIds);
  const names = new Map();
  for (const record of records) {
    if (!wanted.has(record.id)) continue;
    const name = String(
      record.fields?.["Player Name"] ||
        record.fields?.["Full Name"] ||
        record.fields?.Name ||
        "",
    ).trim();
    if (name) names.set(record.id, name);
  }
  return names;
}

function firstName(fullName) {
  if (!fullName) return "";
  return String(fullName).trim().split(/\s+/)[0] || "";
}

// Active subscriptions for a given parent that have the relevant pref
// toggle ON.
async function findEligibleSubscriptions(parentId, kind) {
  const records = await airtableList(pushSubsTable(), { pageSize: PAGE_SIZE });
  const prefField = PREF_FIELD_BY_KIND[kind];
  return records.filter((record) => {
    const fields = record.fields || {};
    if (!fields.Active) return false;
    if (!fields[prefField]) return false;
    const links = Array.isArray(fields.Parent) ? fields.Parent : [];
    return links.includes(parentId);
  });
}

// ----- Dedupe -----

function dedupeKey(sessionId, kind, parentId) {
  return `${sessionId}:${kind}:${parentId}`;
}

// Has this (session, kind, parent) tuple already been sent? We scan the
// table and match on the primary "Dedupe Key" field. The table grows
// roughly N_sessions \u00d7 N_parents \u00d7 N_kinds per week \u2014 small enough to
// scan for years before this becomes a problem.
async function alreadySent(key, sentRecords) {
  return sentRecords.some((row) => String(row?.fields?.["Dedupe Key"] || "") === key);
}

// ----- Send -----

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:noreply@grass2pro.com";
  if (!publicKey || !privateKey) {
    throw new Error("VAPID env vars not configured.");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

// Compose the per-coach push title. Phase 2f: prefer "<coach> \u2014 <team>",
// falling back gracefully if either piece is missing.
function buildTitle(sessionFields) {
  const coach = String(sessionFields.Coach || sessionFields["Lead Coach"] || "").trim();
  const team = String(sessionFields.Team || sessionFields.Squad || "").trim();
  if (coach && team) return `${coach} \u2014 ${team}`;
  if (coach) return coach;
  if (team) return team;
  return "Grass2Pro";
}

function buildBody(kind, sessionFields, { childFirstName = "" } = {}) {
  const location = String(sessionFields.Location || sessionFields.Venue || "").trim();
  const start = String(sessionFields["Start Time"] || sessionFields.Start || "").slice(0, 5);
  switch (kind) {
    case KIND_ONE_HOUR:
      return location
        ? `Session at ${location} starts in 1 hour (${start}).`
        : `Session starts in 1 hour (${start}).`;
    case KIND_CHECK_IN:
      return "Check-in is open. Tap to view your child's QR code.";
    case KIND_PICKUP:
      return "Session ends in 30 min \u2014 pickup soon.";
    case KIND_PICKUP_REMINDER:
      return "Session has ended. Tap to confirm pickup.";
    case KIND_PICKUP_FINAL:
      return "Your child is still marked as on the pitch. Please confirm pickup or contact your coach.";
    case KIND_NO_SHOW: {
      const child = childFirstName || "your child";
      return `Didn't see ${child} at training tonight \u2014 everything okay?`;
    }
    default:
      return "Session reminder.";
  }
}

function buildPayload(kind, sessionFields, sessionId, { childFirstName = "" } = {}) {
  return JSON.stringify({
    title: buildTitle(sessionFields),
    body: buildBody(kind, sessionFields, { childFirstName }),
    tag: `session-${sessionId}-${kind.toLowerCase().replace(/\s+/g, "-")}`,
    url: "/portal",
    data: { sessionId, kind },
  });
}

async function sendOne(subscription, payload) {
  const fields = subscription.fields || {};
  const pushSub = {
    endpoint: String(fields.Endpoint || ""),
    keys: {
      p256dh: String(fields["P256DH Key"] || ""),
      auth: String(fields["Auth Key"] || ""),
    },
  };
  return webpush.sendNotification(pushSub, payload);
}

// ----- Handler -----

export default async (req) => {
  // Scheduled-functions log helper: pull next_run from the body so we have
  // it in the logs for tracing.
  let nextRun = "";
  try {
    const body = await req.json();
    nextRun = body?.next_run || "";
  } catch {
    /* not all invocations are scheduled (manual invokes have no body) */
  }
  console.log("[scheduled-push-fanout] tick", { nextRun, ts: new Date().toISOString() });

  // Debug probe: ?debug=1 returns the candidate selection state as JSON
  // without sending anything. Lets us confirm the cron is parsing sessions
  // correctly when end-to-end tests don't fire as expected.
  let isDebug = false;
  let isCleanup = false;
  try {
    const url = new URL(req.url);
    isDebug = url.searchParams.get("debug") === "1";
    isCleanup = url.searchParams.get("cleanup") === "1";
  } catch { /* manual invocations may not have a parseable URL */ }

  if (!hasAirtableConfig()) {
    console.warn("[scheduled-push-fanout] Airtable not configured; skipping.");
    if (isDebug) return new Response(JSON.stringify({ error: "airtable-not-configured" }), { status: 200, headers: { "content-type": "application/json" } });
    return new Response(null, { status: 204 });
  }

  // Cleanup probe: ?cleanup=1 wipes the Notifications Sent table so we can
  // re-test the fan-out from a clean slate. Test base only \u2014 do not ship
  // this to a base with real audit history.
  if (isCleanup) {
    try {
      const rows = await airtableList(notificationsSentTable(), { pageSize: PAGE_SIZE });
      const results = [];
      for (const row of rows) {
        try {
          await airtableDelete(notificationsSentTable(), row.id);
          results.push({ id: row.id, deleted: true });
        } catch (error) {
          results.push({ id: row.id, deleted: false, error: String(error?.message || error) });
        }
      }
      return new Response(JSON.stringify({ scanned: rows.length, results }, null, 2), { status: 200, headers: { "content-type": "application/json" } });
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error?.message || error) }), { status: 500, headers: { "content-type": "application/json" } });
    }
  }

  try {
    configureWebPush();
  } catch (error) {
    console.error("[scheduled-push-fanout] VAPID config missing:", error);
    return new Response(null, { status: 204 });
  }

  const nowMs = Date.now();
  let candidates;
  let debugAllSessions = null;
  try {
    if (isDebug) {
      // In debug mode, also pull every session and show how each was
      // evaluated against each window so we can see exactly why the
      // candidate didn't match.
      const records = await airtableList(sessionsTable(), { pageSize: PAGE_SIZE });
      debugAllSessions = records.map((record) => {
        const fields = record?.fields || {};
        const date = String(fields.Date || fields["Session Date"] || "");
        const start = String(fields["Start Time"] || fields.Start || "");
        const end = String(fields["End Time"] || fields.End || "");
        const status = String(fields.Status || fields.State || "");
        const startAt = combineLondonDateTime(date, start);
        const endAt = combineLondonDateTime(date, end);
        const evaluations = WINDOWS.map((window) => {
          const edgeAt = window.edge === "start" ? startAt : endAt;
          if (!edgeAt) return { kind: window.kind, reason: "no-edge-date" };
          const targetMs = edgeAt.getTime() - window.offsetMin * 60_000;
          const inWindow = isInWindow(nowMs, targetMs, window.toleranceMin);
          return {
            kind: window.kind,
            targetISO: new Date(targetMs).toISOString(),
            deltaMin: Math.round((nowMs - targetMs) / 60_000),
            inWindow,
          };
        });
        return {
          id: record.id,
          name: String(fields["Session Name"] || fields.Name || ""),
          date,
          start,
          end,
          status,
          startAtISO: startAt ? startAt.toISOString() : null,
          endAtISO: endAt ? endAt.toISOString() : null,
          windows: evaluations,
        };
      });
    }
    candidates = await findCandidateSessions(nowMs);
  } catch (error) {
    console.error("[scheduled-push-fanout] Session lookup failed:", error);
    if (isDebug) return new Response(JSON.stringify({ error: String(error?.message || error) }), { status: 500, headers: { "content-type": "application/json" } });
    return new Response(null, { status: 500 });
  }

  if (isDebug) {
    // Trace the post-candidate path for each candidate without sending
    // anything. Mirrors the real loop's bailouts so we can see exactly
    // which `continue` is firing.
    const traces = [];
    let sentRecordsDbg = [];
    try {
      sentRecordsDbg = await airtableList(notificationsSentTable(), { pageSize: PAGE_SIZE });
    } catch (error) {
      traces.push({ stage: "sentRecords-list", error: String(error?.message || error) });
    }
    for (const candidate of candidates) {
      const trace = { sessionId: candidate.sessionId, kind: candidate.kind, steps: [] };
      let playerHits;
      try {
        playerHits = await findPlayerIdsForSession(candidate.sessionId, candidate.sessionFields, {
          requireOpen: candidate.requiresOpenAttendance,
          requireRsvpComingNoArrival: candidate.requiresRsvpComingNoArrival,
        });
      } catch (error) {
        trace.steps.push({ at: "findPlayerIdsForSession", error: String(error?.message || error) });
        traces.push(trace);
        continue;
      }
      trace.steps.push({ at: "playerHits", count: playerHits.length, playerIds: playerHits.map((h) => h.playerId) });
      if (playerHits.length === 0) { traces.push(trace); continue; }
      const playerIds = playerHits.map((h) => h.playerId);
      let parentToPlayers;
      try {
        parentToPlayers = await findParentIdsForPlayers(playerIds);
      } catch (error) {
        trace.steps.push({ at: "findParentIdsForPlayers", error: String(error?.message || error) });
        traces.push(trace);
        continue;
      }
      trace.steps.push({ at: "parentIds", parents: [...parentToPlayers.keys()] });
      if (parentToPlayers.size === 0) { traces.push(trace); continue; }
      let parentEmailsDbg = new Map();
      if (candidate.kind === KIND_NO_SHOW) {
        try {
          parentEmailsDbg = await findParentEmailsByIds([...parentToPlayers.keys()]);
        } catch (error) {
          trace.steps.push({ at: "findParentEmailsByIds", error: String(error?.message || error) });
        }
      }
      for (const [parentId, linkedPlayerIds] of parentToPlayers.entries()) {
        const key = dedupeKey(candidate.sessionId, candidate.kind, parentId);
        const already = await alreadySent(key, sentRecordsDbg);
        const subs = await findEligibleSubscriptions(parentId, candidate.kind).catch((e) => ({ __error: String(e?.message || e) }));
        const email = parentEmailsDbg.get(parentId) || null;
        trace.steps.push({
          at: "parentLoop",
          parentId,
          dedupeKey: key,
          alreadySent: already,
          subscriptionCount: Array.isArray(subs) ? subs.length : 0,
          subError: subs && subs.__error ? subs.__error : null,
          emailForFallback: email,
          linkedPlayerIds: [...linkedPlayerIds],
        });
        // Attempt the dedupe row create with the same payload the real path
        // uses, so we can confirm whether airtableCreate is the failing
        // step. The created row is harmless — it has Status=Skipped, so the
        // real cron will skip this parent on its next tick (which is the
        // expected dedupe behaviour anyway).
        if (!already && candidate.kind === KIND_NO_SHOW) {
          try {
            const created = await airtableCreate(notificationsSentTable(), {
              "Dedupe Key": key,
              Session: [candidate.sessionId],
              Parent: [parentId],
              Kind: candidate.kind,
              "Sent At": new Date().toISOString(),
              Status: "Skipped",
            });
            trace.steps.push({ at: "dedupeRowCreate", ok: true, id: created.id, returnedFields: Object.keys(created.fields || {}) });
            // Roll back immediately so debug=1 doesn't pollute the dedupe
            // table. Without this, every debug call leaves a row that
            // makes the next real cron tick think the parent was already
            // notified \u2014 which is exactly the false-positive bug we hit
            // earlier (real path saw alreadySent=true and bailed silently).
            try {
              await airtableDelete(notificationsSentTable(), created.id);
              trace.steps.push({ at: "dedupeRowRollback", ok: true, id: created.id });
            } catch (delError) {
              trace.steps.push({ at: "dedupeRowRollback", ok: false, error: String(delError?.message || delError) });
            }
          } catch (error) {
            trace.steps.push({ at: "dedupeRowCreate", ok: false, error: String(error?.message || error) });
          }
        }
      }
      traces.push(trace);
    }
    return new Response(JSON.stringify({
      nowISO: new Date(nowMs).toISOString(),
      candidateCount: candidates.length,
      candidates: candidates.map((c) => ({ sessionId: c.sessionId, kind: c.kind, targetAt: c.targetAt })),
      sentRowsCount: sentRecordsDbg.length,
      traces,
      allSessions: debugAllSessions,
      env: {
        hasResendKey: !!process.env.RESEND_API_KEY,
        emailFrom: process.env.EMAIL_FROM || null,
      },
    }, null, 2), { status: 200, headers: { "content-type": "application/json" } });
  }

  if (candidates.length === 0) {
    console.log("[scheduled-push-fanout] No candidate sessions in window.");
    return new Response(null, { status: 204 });
  }

  // Pre-fetch the Notifications Sent table once and reuse for all dedupe
  // checks in this tick. Saves N\u00d7M list calls when many candidates land
  // in the same window.
  let sentRecords = [];
  try {
    sentRecords = await airtableList(notificationsSentTable(), { pageSize: PAGE_SIZE });
  } catch (error) {
    // Continue with an empty list \u2014 worst case we re-send within the
    // current 5-min window, which is bounded.
    console.warn("[scheduled-push-fanout] Notifications Sent list failed:", error);
  }

  let attempted = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  // ?stats=2 traces every step of the REAL loop so we can see exactly
  // which line bails when the loop runs but no counters move. Mirrors
  // ?debug=1's per-candidate trace but for the actual send path.
  let isStats2 = false;
  try {
    const u = new URL(req.url);
    isStats2 = u.searchParams.get("stats") === "2";
  } catch { /* parse failure ok */ }
  const realTraces = [];
  const tracePush = (entry) => { if (isStats2) realTraces.push(entry); };
  tracePush({ at: "sentRecordsListed", count: sentRecords.length });
  tracePush({ at: "loopStart", candidateCount: candidates.length, isArray: Array.isArray(candidates), kinds: candidates.map((c) => c.kind) });

  for (const candidate of candidates) {
    tracePush({ at: "iterEnter", kind: candidate.kind, sessionId: candidate.sessionId });
    const { sessionId, sessionFields, kind, requiresOpenAttendance, requiresRsvpComingNoArrival } = candidate;
    let playerHits;
    try {
      playerHits = await findPlayerIdsForSession(sessionId, sessionFields, {
        requireOpen: requiresOpenAttendance,
        requireRsvpComingNoArrival,
      });
    } catch (error) {
      tracePush({ at: "playerHits-throw", kind, error: String(error?.message || error), stack: String(error?.stack || "").slice(0, 500) });
      console.error("[scheduled-push-fanout] Player lookup failed:", { sessionId, error });
      continue;
    }
    tracePush({ at: "playerHits", kind: candidate.kind, count: playerHits.length });
    if (playerHits.length === 0) continue;

    const playerIds = playerHits.map((h) => h.playerId);
    // Map<playerId, attendanceId|null> so the no-show branch can flip the
    // Parent Notified flag on the right row after sending.
    const playerToAttendance = new Map(
      playerHits.map((h) => [h.playerId, h.attendanceId]),
    );

    let parentToPlayers; // Map<parentId, Set<playerId>>
    try {
      parentToPlayers = await findParentIdsForPlayers(playerIds);
    } catch (error) {
      tracePush({ at: "parentLookup-throw", kind, error: String(error?.message || error), stack: String(error?.stack || "").slice(0, 500) });
      console.error("[scheduled-push-fanout] Parent lookup failed:", { sessionId, error });
      continue;
    }
    tracePush({ at: "parentToPlayers", kind: candidate.kind, size: parentToPlayers.size, parents: [...parentToPlayers.keys()] });
    if (parentToPlayers.size === 0) continue;

    // For the no-show kind we also need parent emails and player names so the
    // email fallback can address the parent and name the right child.
    let parentEmails = new Map();
    let playerNames = new Map();
    if (kind === KIND_NO_SHOW) {
      try {
        [parentEmails, playerNames] = await Promise.all([
          findParentEmailsByIds([...parentToPlayers.keys()]),
          findPlayerNamesByIds(playerIds),
        ]);
        tracePush({ at: "noshowLookups", emailsSize: parentEmails.size, namesSize: playerNames.size });
      } catch (error) {
        tracePush({ at: "noshowLookups", error: String(error?.message || error) });
        console.warn("[scheduled-push-fanout] No-show lookup helpers failed:", error);
      }
    }

    for (const [parentId, linkedPlayerIds] of parentToPlayers.entries()) {
      const key = dedupeKey(sessionId, kind, parentId);
      const already = await alreadySent(key, sentRecords);
      tracePush({ at: "alreadySent", kind, parentId, key, already });
      if (already) continue;

      // Pick the first matching player for this parent so we can name the
      // child in the message body. Multi-child households at the same
      // session are rare; if it happens we just name the first one we hit.
      const firstPlayerId = [...linkedPlayerIds][0];
      const childFullName = playerNames.get(firstPlayerId) || "";
      const childFirst = firstName(childFullName);
      const attendanceIdForFlag = playerToAttendance.get(firstPlayerId) || null;

      let subscriptions = [];
      try {
        subscriptions = await findEligibleSubscriptions(parentId, kind);
      } catch (error) {
        console.error("[scheduled-push-fanout] Subscription lookup failed:", { parentId, error });
        // For no-show we still attempt the email fallback below; for other
        // kinds we skip the parent.
        if (kind !== KIND_NO_SHOW) continue;
      }

      tracePush({ at: "subscriptions", kind, parentId, count: subscriptions.length });
      // Non-noshow kinds keep their old behaviour: skip when there are no
      // eligible subscriptions. The no-show kind continues so we can fall
      // back to email even when the parent never subscribed to push.
      if (subscriptions.length === 0 && kind !== KIND_NO_SHOW) {
        tracePush({ at: "earlyExit", reason: "no-subs-and-not-noshow", kind });
        continue;
      }

      // Write the dedupe row FIRST so a re-tick within the window cannot
      // double-send. Status starts as "Skipped" and is upgraded after the
      // send completes.
      let dedupeRow;
      try {
        dedupeRow = await airtableCreate(notificationsSentTable(), {
          "Dedupe Key": key,
          Session: [sessionId],
          Parent: [parentId],
          Kind: kind,
          "Sent At": new Date().toISOString(),
          Status: "Skipped",
        });
        tracePush({ at: "dedupeRowCreate", ok: true, id: dedupeRow.id });
      } catch (error) {
        tracePush({ at: "dedupeRowCreate", ok: false, error: String(error?.message || error) });
        console.error("[scheduled-push-fanout] Dedupe row create failed:", { key, error });
        continue;
      }
      sentRecords.push(dedupeRow);

      const payload = buildPayload(kind, sessionFields, sessionId, { childFirstName: childFirst });

      // ----- Push send -----
      let firstStatus = null;
      let firstHttp = null;
      let firstError = null;
      for (const sub of subscriptions) {
        attempted += 1;
        try {
          await sendOne(sub, payload);
          if (firstStatus === null) {
            firstStatus = "Sent";
            firstHttp = 201;
          }
          sent += 1;
        } catch (error) {
          const httpStatus = Number(error?.statusCode || 0);
          if (firstStatus === null) {
            firstStatus = "Failed";
            firstHttp = httpStatus;
            firstError = String(error?.message || error);
          }
          // 404 / 410 mean the subscription is gone \u2014 deactivate it so we
          // stop trying next tick.
          if (httpStatus === 404 || httpStatus === 410) {
            try {
              await airtableUpdate(pushSubsTable(), sub.id, {
                Active: false,
                "Failure Count": Number(sub.fields?.["Failure Count"] || 0) + 1,
              });
            } catch (deactivateError) {
              console.error("[scheduled-push-fanout] Deactivate failed:", deactivateError);
            }
          }
          failed += 1;
        }
      }

      // ----- Email fallback (no-show only) -----
      // Always send the email for no-show, regardless of push outcome. This
      // is the spec's check-in tone \u2014 a parent who's already seen the push
      // and replied to the coach won't mind a follow-up email saying the
      // same thing, but a parent on iOS without PWA install would otherwise
      // get nothing at all.
      let emailStatus = null;
      let emailError = null;
      if (kind === KIND_NO_SHOW) {
        const to = parentEmails.get(parentId);
        tracePush({ at: "emailFallback", kind, parentId, to: to || null });
        if (to) {
          attempted += 1;
          const result = await sendNoShowCheckInEmail({
            to,
            childFirstName: childFirst,
            coachName: String(sessionFields.Coach || sessionFields["Lead Coach"] || "").trim(),
            sessionName: String(sessionFields["Session Name"] || sessionFields.Name || "").trim(),
            sessionDate: String(sessionFields.Date || sessionFields["Session Date"] || "").trim(),
          });
          if (result.ok) {
            emailStatus = "Sent";
            sent += 1;
            if (firstStatus === null) {
              firstStatus = "Sent";
              firstHttp = 201;
            }
          } else {
            emailStatus = "Failed";
            emailError = result.reason || "send-failed";
            failed += 1;
            if (firstStatus === null) {
              firstStatus = "Failed";
              firstError = `email: ${emailError}`;
            }
          }
        } else {
          emailStatus = "Skipped";
          emailError = "no-parent-email";
        }

        // Flip Parent Notified on the attendance row so the same row never
        // gets re-nagged. Only flip on Sent so a transient failure can
        // be retried by the next scheduled tick (caveat: the Notifications
        // Sent dedupe row already prevents that today, but the flag is
        // still useful as a UI indicator for the coach dashboard).
        if (attendanceIdForFlag && emailStatus === "Sent") {
          try {
            await airtableUpdate(attendanceTable(), attendanceIdForFlag, {
              "Parent Notified": true,
            });
          } catch (flagError) {
            console.warn("[scheduled-push-fanout] Parent Notified flag flip failed:", flagError);
          }
        }
      }

      // ----- Finalise audit row -----
      try {
        const finalStatus = firstStatus || "Skipped";
        const errorBits = [firstError, emailError ? `email: ${emailError}` : null]
          .filter(Boolean)
          .join(" | ");
        await airtableUpdate(notificationsSentTable(), dedupeRow.id, {
          Status: finalStatus,
          "HTTP Status": firstHttp || 0,
          Error: errorBits,
          Subscription: subscriptions.map((s) => s.id),
        });
      } catch (error) {
        console.warn("[scheduled-push-fanout] Dedupe row finalisation failed:", error);
      }
      if (firstStatus !== "Sent") skipped += 1;
    }
  }

  tracePush({ at: "loopEnd" });
  console.log("[scheduled-push-fanout] done", { candidates: candidates.length, attempted, sent, failed, skipped });
  // Stats probe: ?stats=1 reports the run summary as JSON instead of the
  // silent 204. Lets us see what the REAL path actually does (vs debug=1
  // which short-circuits before the send loop).
  let isStats = false;
  try {
    const url = new URL(req.url);
    isStats = url.searchParams.get("stats") === "1";
  } catch { /* parse failure ok */ }
  if (isStats) {
    return new Response(JSON.stringify({ candidates: candidates.length, attempted, sent, failed, skipped }, null, 2), { status: 200, headers: { "content-type": "application/json" } });
  }
  if (isStats2) {
    return new Response(JSON.stringify({ candidates: candidates.length, attempted, sent, failed, skipped, traces: realTraces }, null, 2), { status: 200, headers: { "content-type": "application/json" } });
  }
  return new Response(null, { status: 204 });
};

export const config = {
  // Every 5 minutes (Netlify cron is in UTC; minute granularity only).
  schedule: "*/5 * * * *",
};
