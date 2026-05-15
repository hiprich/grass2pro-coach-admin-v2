/**
 * Diagnostic: check why coach announcements are not reaching a parent portal.
 *
 * Usage (reads .env.local automatically):
 *   node --env-file=.env.local scripts/check-announcements.mjs
 *
 * Optional env overrides:
 *   PARENT_EMAIL=candice@example.com   — parent to test (default: first match)
 *   COACH_NAME=Cobby                   — coach name fragment to search (default: any)
 */

const BASE    = process.env.AIRTABLE_BASE_ID;
const TOKEN   = process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY;
const API     = `https://api.airtable.com/v0/${BASE}`;

const PLAYERS_TABLE       = process.env.AIRTABLE_PLAYERS_TABLE       || "Players";
const COACHES_TABLE       = process.env.AIRTABLE_COACHES_TABLE       || "Coaches";
const ANNOUNCEMENTS_TABLE = process.env.AIRTABLE_ANNOUNCEMENTS_TABLE || "Announcements";
const PARENTS_TABLE       = process.env.AIRTABLE_PARENTS_TABLE       || "Parents/Guardians";

const PARENT_EMAIL_FILTER = (process.env.PARENT_EMAIL || "candice").trim().toLowerCase();
const COACH_NAME_FILTER   = (process.env.COACH_NAME   || "cobby").trim().toLowerCase();

if (!BASE || !TOKEN) {
  console.error("❌  AIRTABLE_BASE_ID and AIRTABLE_TOKEN must be set.");
  console.error("   Run:  node --env-file=.env.local scripts/check-announcements.mjs");
  process.exit(1);
}

// ── helpers ────────────────────────────────────────────────────────────────

function encodeTable(name) {
  return /^tbl[a-zA-Z0-9]{10,}$/.test(name) ? name : encodeURIComponent(name);
}

async function listAll(table, params = {}) {
  const rows = [];
  let offset;
  do {
    const url = new URL(`${API}/${encodeTable(table)}`);
    Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Airtable ${table}: ${res.status} ${txt}`);
    }
    const payload = await res.json();
    rows.push(...(payload.records || []));
    offset = payload.offset;
  } while (offset);
  return rows;
}

function looksLikeRecordId(v) {
  return typeof v === "string" && /^rec[a-zA-Z0-9]{14,}$/.test(v);
}

function recordIds(value) {
  const ids = [];
  const push = (entry) => {
    const s = String(entry || "").trim();
    if (looksLikeRecordId(s) && !ids.includes(s)) ids.push(s);
  };
  if (Array.isArray(value)) value.forEach(push);
  else if (typeof value === "string") value.split(",").forEach(push);
  return ids;
}

function str(v, fallback = "") {
  if (Array.isArray(v)) return v.filter(Boolean).join(", ");
  return v == null ? fallback : String(v);
}

const ok  = (msg) => console.log(`  ✅  ${msg}`);
const warn = (msg) => console.log(`  ⚠️   ${msg}`);
const fail = (msg) => console.log(`  ❌  ${msg}`);
const info = (msg) => console.log(`  ℹ️   ${msg}`);
const head = (msg) => console.log(`\n─── ${msg} ${"─".repeat(Math.max(0, 54 - msg.length))}`);

// ── main ───────────────────────────────────────────────────────────────────

head("Step 1 — Load Coaches table");
const coaches = await listAll(COACHES_TABLE).catch(e => { fail(e.message); process.exit(1); });
info(`${coaches.length} coach record(s) found.`);

const targetCoach = coaches.find(c =>
  str(c.fields["Full Name"] || c.fields.Name || c.fields["Coach Name"])
    .toLowerCase().includes(COACH_NAME_FILTER)
);
if (!targetCoach) {
  fail(`No coach whose name contains "${COACH_NAME_FILTER}" found in "${COACHES_TABLE}".`);
  info("All coaches: " + coaches.map(c =>
    `${c.id}  ${str(c.fields["Full Name"] || c.fields.Name)}`
  ).join("\n              "));
  process.exit(1);
}
ok(`Found coach: "${str(targetCoach.fields["Full Name"] || targetCoach.fields.Name)}"  →  ${targetCoach.id}`);
const coachId = targetCoach.id;
const coachEmail = str(targetCoach.fields.Email).trim().toLowerCase();
if (coachEmail) info(`Coach email on record: ${coachEmail}`);

// ── Step 2: Announcements ──────────────────────────────────────────────────
head("Step 2 — Load Announcements table");
let annRows;
try {
  annRows = await listAll(ANNOUNCEMENTS_TABLE);
} catch (e) {
  fail(`Could not read "${ANNOUNCEMENTS_TABLE}": ${e.message}`);
  info("Check AIRTABLE_ANNOUNCEMENTS_TABLE in your env — currently: " + ANNOUNCEMENTS_TABLE);
  process.exit(1);
}
info(`${annRows.length} row(s) in "${ANNOUNCEMENTS_TABLE}".`);

if (annRows.length === 0) {
  warn("Announcements table is empty. Either no announcement was created yet, or the wrong table name is configured.");
  process.exit(0);
}

// Show all rows and their Coach links
const matchingAnn = [];
for (const row of annRows) {
  const f = row.fields;
  const title  = str(f.Title || f.Name, "(no title)");
  const body   = str(f.Body  || f.Message || f.Notes, "").slice(0, 60);
  const active = f.Active === undefined ? "(not set — treated as true)" : String(f.Active);
  const linked = recordIds(f.Coach || f["Lead Coach"]);
  const matchesCoach = linked.includes(coachId);
  const line = `  id=${row.id}  title="${title}"  active=${active}  Coach=${JSON.stringify(linked)}`;
  if (matchesCoach) {
    ok(`MATCH  ${line}`);
    info(`        body: "${body}"`);
    matchingAnn.push(row);
  } else {
    warn(`no match  ${line}`);
    if (linked.length === 0) {
      fail(`        → The Coach column is BLANK on this row. The announcement won't reach any parent.`);
      info(`        → Fix: open this row in Airtable and link it to "${str(targetCoach.fields["Full Name"] || targetCoach.fields.Name)}" (${coachId}).`);
    } else {
      info(`        → Coach IDs on row (${linked.join(", ")}) don't match Cobby's ID (${coachId}).`);
    }
  }
}

if (matchingAnn.length === 0) {
  fail(`None of the ${annRows.length} announcement row(s) have their Coach field linked to ${coachId}.`);
} else {
  ok(`${matchingAnn.length} announcement(s) linked to this coach.`);
  const inactive = matchingAnn.filter(r => r.fields.Active === false);
  if (inactive.length) {
    fail(`${inactive.length} of those are marked Active=false — they won't show in the portal.`);
  }
}

// ── Step 3: Players & parent link ─────────────────────────────────────────
head("Step 3 — Load Players table");
const players = await listAll(PLAYERS_TABLE).catch(e => { fail(e.message); process.exit(1); });
info(`${players.length} player record(s) found.`);

// Find parent's players by email or guardian link
head(`Step 4 — Find players for parent "${PARENT_EMAIL_FILTER}"`);
let guardianIds = new Set();
try {
  const guardians = await listAll(PARENTS_TABLE);
  guardianIds = new Set(
    guardians
      .filter(g => str(g.fields.Email).trim().toLowerCase().includes(PARENT_EMAIL_FILTER))
      .map(g => { info(`Guardian record: ${g.id}  email=${str(g.fields.Email)}`); return g.id; })
  );
} catch {
  warn(`Could not load "${PARENTS_TABLE}" — skipping guardian-link check.`);
}

const parentPlayers = players.filter(p => {
  const f = p.fields;
  const directEmail = str(f["Parent Email"]).trim().toLowerCase();
  if (directEmail.includes(PARENT_EMAIL_FILTER)) return true;
  const gids = recordIds(f["Parent/Guardian"] || f.Parent || f["Guardian Name"]);
  return gids.some(id => guardianIds.has(id));
});

if (parentPlayers.length === 0) {
  fail(`No players found for parent containing "${PARENT_EMAIL_FILTER}".`);
  info("Check that Chevelle's player record has the correct Parent Email field or Parent/Guardian link.");
} else {
  ok(`${parentPlayers.length} player(s) found for this parent:`);
}

for (const p of parentPlayers) {
  const f = p.fields;
  const name   = str(f["Full Name"] || f.Name || f["Player Name"], "(unnamed)");
  const linked = [
    ...recordIds(f.Coach),
    ...recordIds(f["Lead Coach"]),
    ...recordIds(f.Coaches),
  ].filter((id, i, arr) => arr.indexOf(id) === i);

  info(`Player: "${name}"  id=${p.id}`);
  info(`  Parent Email field: "${str(f["Parent Email"])}"`);
  info(`  Coach IDs on player record: ${linked.length ? linked.join(", ") : "(none)"}`);

  if (linked.length === 0) {
    fail(`  → Coach field is EMPTY on this player. The portal cannot fetch announcements without it.`);
    info(`  → Fix: open "${name}" in Airtable → set the Coach (linked-record) field to Cobby (${coachId}).`);
  } else if (!linked.includes(coachId)) {
    fail(`  → Player's Coach IDs (${linked.join(", ")}) do NOT include Cobby's ID (${coachId}).`);
    info(`  → The field may point to a different coach record. Relink it to ${coachId}.`);
  } else {
    ok(`  → Player IS linked to coach ${coachId} ✓`);
  }
}

// ── Step 5: Summary ────────────────────────────────────────────────────────
head("Summary");
const playerCoachIds = new Set(
  parentPlayers.flatMap(p => [
    ...recordIds(p.fields.Coach),
    ...recordIds(p.fields["Lead Coach"]),
    ...recordIds(p.fields.Coaches),
  ])
);
const deliverable = matchingAnn.filter(
  r => r.fields.Active !== false && recordIds(r.fields.Coach || r.fields["Lead Coach"]).some(id => playerCoachIds.has(id))
);
if (deliverable.length > 0) {
  ok(`${deliverable.length} announcement(s) WOULD reach the parent portal right now.`);
} else {
  fail("0 announcements would reach the parent portal. Fix the issues above, then redeploy.");
}
