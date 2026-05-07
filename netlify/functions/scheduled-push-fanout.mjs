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
  airtableGet,
  airtableList,
  hasAirtableConfig,
  tableName,
} from "./_airtable.mjs";

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

// Pref-field name on the Push Subscriptions table for each kind. Used to
// filter which subscriptions should receive a given kind.
const PREF_FIELD_BY_KIND = {
  [KIND_ONE_HOUR]: "Pref One Hour Reminder",
  [KIND_CHECK_IN]: "Pref Check In Open",
  [KIND_PICKUP]: "Pref Pickup Soon",
  [KIND_PICKUP_REMINDER]: "Pref Pickup Confirm Reminder",
  [KIND_PICKUP_FINAL]: "Pref Pickup Confirm Final",
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
      });
    }
  }
  return candidates;
}

// Find player record ids attending a given session. We use the Attendance
// table when present (most reliable), otherwise fall back to the Players[]
// link directly on the Session row.
//
// When `requireOpen` is true (Phase A4 pickup-confirm), we narrow further to
// only attendance rows that have an arrivalTime AND no departureTime — i.e.
// the child is still on the pitch. In that mode we DO NOT fall back to the
// Session.Players link, because that fallback can't tell us which players
// have an open attendance row.
async function findPlayerIdsForSession(sessionId, sessionFields, { requireOpen = false } = {}) {
  // Prefer attendance rows for this session.
  try {
    const attendance = await airtableList(attendanceTable(), { pageSize: PAGE_SIZE });
    const ids = new Set();
    for (const row of attendance) {
      const link = Array.isArray(row?.fields?.Session) ? row.fields.Session : [];
      if (!link.includes(sessionId)) continue;
      if (requireOpen) {
        const arrival = row?.fields?.["Arrival Time"];
        const departure = row?.fields?.["Departure Time"];
        if (!arrival || departure) continue;
      }
      const playerLink = Array.isArray(row?.fields?.Player) ? row.fields.Player : [];
      for (const id of playerLink) ids.add(id);
    }
    if (ids.size > 0) return [...ids];
    // No matches — for requireOpen this means everyone's already been picked
    // up (or nobody scanned in), so we explicitly return empty rather than
    // falling back to a broader list that could re-surface departed kids.
    if (requireOpen) return [];
  } catch (error) {
    console.warn("[scheduled-push-fanout] Attendance lookup failed; falling back to Session.Players:", error);
    if (requireOpen) return [];
  }
  // Fallback: the Session row's Players link field.
  const fallback = Array.isArray(sessionFields?.Players) ? sessionFields.Players : [];
  return fallback;
}

// Resolve player ids \u2192 unique parent record ids. Players can have multiple
// linked parents; we union them all.
async function findParentIdsForPlayers(playerIds) {
  if (playerIds.length === 0) return [];
  const players = await airtableList(playersTable(), { pageSize: PAGE_SIZE });
  const wanted = new Set(playerIds);
  const parentIds = new Set();
  for (const record of players) {
    if (!wanted.has(record.id)) continue;
    const fields = record.fields || {};
    const links = fields["Parent/Guardian"] || fields.Parent;
    if (Array.isArray(links)) for (const id of links) parentIds.add(id);
  }
  return [...parentIds];
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

function buildBody(kind, sessionFields) {
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
    default:
      return "Session reminder.";
  }
}

function buildPayload(kind, sessionFields, sessionId) {
  return JSON.stringify({
    title: buildTitle(sessionFields),
    body: buildBody(kind, sessionFields),
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

  if (!hasAirtableConfig()) {
    console.warn("[scheduled-push-fanout] Airtable not configured; skipping.");
    return new Response(null, { status: 204 });
  }

  try {
    configureWebPush();
  } catch (error) {
    console.error("[scheduled-push-fanout] VAPID config missing:", error);
    return new Response(null, { status: 204 });
  }

  const nowMs = Date.now();
  let candidates;
  try {
    candidates = await findCandidateSessions(nowMs);
  } catch (error) {
    console.error("[scheduled-push-fanout] Session lookup failed:", error);
    return new Response(null, { status: 500 });
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

  for (const candidate of candidates) {
    const { sessionId, sessionFields, kind, requiresOpenAttendance } = candidate;
    let playerIds;
    try {
      playerIds = await findPlayerIdsForSession(sessionId, sessionFields, {
        requireOpen: requiresOpenAttendance,
      });
    } catch (error) {
      console.error("[scheduled-push-fanout] Player lookup failed:", { sessionId, error });
      continue;
    }
    if (playerIds.length === 0) continue;

    let parentIds;
    try {
      parentIds = await findParentIdsForPlayers(playerIds);
    } catch (error) {
      console.error("[scheduled-push-fanout] Parent lookup failed:", { sessionId, error });
      continue;
    }
    if (parentIds.length === 0) continue;

    const payload = buildPayload(kind, sessionFields, sessionId);

    for (const parentId of parentIds) {
      const key = dedupeKey(sessionId, kind, parentId);
      if (await alreadySent(key, sentRecords)) {
        continue;
      }

      let subscriptions;
      try {
        subscriptions = await findEligibleSubscriptions(parentId, kind);
      } catch (error) {
        console.error("[scheduled-push-fanout] Subscription lookup failed:", { parentId, error });
        continue;
      }
      if (subscriptions.length === 0) continue;

      // Write the dedupe row FIRST so a re-tick within the window cannot
      // double-send. Status starts as "Skipped" and is upgraded after the
      // send completes; if we crash between the create and send we err on
      // the safe side (the parent gets no notification rather than two).
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
      } catch (error) {
        console.error("[scheduled-push-fanout] Dedupe row create failed:", { key, error });
        continue;
      }
      // Add it to the in-memory list so the next iteration in this tick
      // dedupes correctly even if we somehow reach the same key twice.
      sentRecords.push(dedupeRow);

      // Send to every active subscription for this parent. We only update
      // the dedupe row once with the FIRST subscription's outcome \u2014 if a
      // parent has 3 devices and 1 fails, we still log success because at
      // least one device was reached. Per-device error visibility lives in
      // function logs.
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
          // stop trying next tick. web-push throws an error with the
          // statusCode set when the push service rejects.
          if (httpStatus === 404 || httpStatus === 410) {
            try {
              const { airtableUpdate } = await import("./_airtable.mjs");
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

      try {
        const { airtableUpdate } = await import("./_airtable.mjs");
        await airtableUpdate(notificationsSentTable(), dedupeRow.id, {
          Status: firstStatus || "Skipped",
          "HTTP Status": firstHttp || 0,
          Error: firstError || "",
          Subscription: subscriptions.map((s) => s.id),
        });
      } catch (error) {
        console.warn("[scheduled-push-fanout] Dedupe row finalisation failed:", error);
      }
      if (firstStatus !== "Sent") skipped += 1;
    }
  }

  console.log("[scheduled-push-fanout] done", { candidates: candidates.length, attempted, sent, failed, skipped });
  return new Response(null, { status: 204 });
};

export const config = {
  // Every 5 minutes (Netlify cron is in UTC; minute granularity only).
  schedule: "*/5 * * * *",
};
