#!/usr/bin/env node
// Create missing Airtable tables/fields for coach announcements and registrations.
// Usage: node scripts/airtable-setup-tables.mjs [--dry-run]

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const DRY_RUN = process.argv.includes("--dry-run");

function loadEnvLocal() {
  const path = resolve(ROOT, ".env.local");
  if (!existsSync(path)) {
    console.error("Missing .env.local — add AIRTABLE_TOKEN and AIRTABLE_BASE_ID.");
    process.exit(1);
  }
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

const token = () => process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY;
const baseId = () => process.env.AIRTABLE_BASE_ID;

function printSchemaWriteHelp() {
  console.error(`
Your Airtable token can read the base but cannot create tables or fields.

1. Open https://airtable.com/create/tokens
2. Edit the token in .env.local (or create a new one) and enable:
   - schema.bases:read
   - schema.bases:write
   - data.records:read
   - data.records:write
3. Add this base as a resource for the token.
4. Update AIRTABLE_TOKEN in .env.local and run:
   npm run airtable:setup
`);
}

async function meta(path, options = {}) {
  const url = `https://api.airtable.com/v0/meta/bases/${baseId()}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    if (response.status === 403 && options.method === "POST") {
      printSchemaWriteHelp();
    }
    const err = new Error(typeof body === "object" ? body?.error?.message || text : text);
    err.status = response.status;
    err.body = body;
    throw err;
  }
  return body;
}

function tableByName(tables, name) {
  return tables.find((t) => t.name === name) || null;
}

function fieldByName(table, name) {
  return table?.fields?.find((f) => f.name === name) || null;
}

async function createTable(name, fields, description) {
  console.log(`\n→ Create table "${name}"${DRY_RUN ? " (dry-run)" : ""}…`);
  if (DRY_RUN) return { id: `dry_${name}`, name, fields: fields.map((f) => ({ name: f.name })) };
  return meta("/tables", {
    method: "POST",
    body: JSON.stringify({ name, description, fields }),
  });
}

async function createField(tableId, field) {
  console.log(`  + field "${field.name}" on ${tableId}${DRY_RUN ? " (dry-run)" : ""}`);
  if (DRY_RUN) return;
  await meta(`/tables/${tableId}/fields`, {
    method: "POST",
    body: JSON.stringify(field),
  });
}

function linkToCoaches(coachesTableId) {
  return {
    type: "multipleRecordLinks",
    options: { linkedTableId: coachesTableId },
  };
}

function checkboxField() {
  return {
    type: "checkbox",
    options: { icon: "check", color: "greenBright" },
  };
}

function dateTimeField() {
  return {
    type: "dateTime",
    options: {
      dateFormat: { name: "iso" },
      timeFormat: { name: "24hour" },
      timeZone: "utc",
    },
  };
}

const AGE_GROUPS = ["U7", "U8", "U9", "U10", "U11", "U12"].map((name) => ({ name }));

async function main() {
  loadEnvLocal();
  if (!token() || !baseId()) {
    console.error("AIRTABLE_TOKEN and AIRTABLE_BASE_ID required in .env.local");
    process.exit(1);
  }

  const schema = await meta("/tables");
  const tables = schema.tables || [];
  const coaches = tableByName(tables, "Coaches") || tableByName(tables, process.env.AIRTABLE_COACHES_TABLE);
  if (!coaches?.id) {
    console.error('Could not find a "Coaches" table in this base.');
    process.exit(1);
  }
  console.log(`Base ${baseId()} — Coaches table: ${coaches.id}`);

  // --- Announcements ---
  let announcements = tableByName(tables, "Announcements");
  if (!announcements) {
    announcements = await createTable(
      "Announcements",
      [
        { name: "Title", type: "singleLineText" },
        { name: "Body", type: "multilineText" },
        { name: "Coach", ...linkToCoaches(coaches.id) },
        { name: "Active", ...checkboxField() },
        { name: "Published At", ...dateTimeField() },
      ],
      "Coach squad broadcasts shown to linked parents.",
    );
    console.log(`  Created Announcements → ${announcements.id}`);
  } else {
    console.log(`\n✓ Announcements already exists (${announcements.id})`);
    const needed = [
      { name: "Title", type: "singleLineText" },
      { name: "Body", type: "multilineText" },
      { name: "Coach", ...linkToCoaches(coaches.id) },
      { name: "Active", ...checkboxField() },
      { name: "Published At", ...dateTimeField() },
    ];
    for (const spec of needed) {
      if (!fieldByName(announcements, spec.name)) {
        await createField(announcements.id, spec);
      }
    }
  }

  // --- Coach Registrations ---
  let registrations = tableByName(tables, "Coach Registrations");
  if (!registrations) {
    registrations = await createTable(
      "Coach Registrations",
      [
        { name: "Parent Name", type: "singleLineText" },
        { name: "Parent Email", type: "email" },
        { name: "Parent Phone", type: "phoneNumber" },
        { name: "Child Name", type: "singleLineText" },
        {
          name: "Child Age Group",
          type: "singleSelect",
          options: { choices: AGE_GROUPS },
        },
        { name: "Coach", ...linkToCoaches(coaches.id) },
        { name: "Coach Slug", type: "singleLineText" },
        { name: "Message", type: "multilineText" },
        { name: "Submitted At", ...dateTimeField() },
        {
          name: "Status",
          type: "singleSelect",
          options: {
            choices: [
              { name: "New", color: "blueLight2" },
              { name: "Invited", color: "greenLight2" },
              { name: "Contacted", color: "yellowLight2" },
            ],
          },
        },
        { name: "Source", type: "singleLineText" },
        { name: "Coach Notified", ...checkboxField() },
      ],
      "Landing-page registration enquiries from /c/:slug.",
    );
    console.log(`  Created Coach Registrations → ${registrations.id}`);
  } else {
    console.log(`\n✓ Coach Registrations already exists (${registrations.id})`);
  }

  // --- Coaches: account / landing fields ---
  const coachFields = [
    { name: "Bio", type: "multilineText" },
    { name: "Avatar Image", type: "multipleAttachments" },
    { name: "Public Slug", type: "singleLineText" },
    { name: "Location", type: "singleLineText" },
  ];
  console.log(`\n→ Coaches table (${coaches.id}) — ensure account fields…`);
  const freshCoaches = (await meta("/tables")).tables.find((t) => t.id === coaches.id);
  for (const spec of coachFields) {
    if (!fieldByName(freshCoaches, spec.name)) {
      await createField(coaches.id, spec);
    } else {
      console.log(`  ✓ ${spec.name}`);
    }
  }

  // --- Players: Coach link ---
  const players = tableByName(tables, "Players");
  if (players && !fieldByName(players, "Coach")) {
    console.log(`\n→ Players — add Coach link…`);
    await createField(players.id, { name: "Coach", ...linkToCoaches(coaches.id) });
  } else if (players) {
    console.log(`\n✓ Players.Coach link present`);
  }

  console.log("\nDone. Set in Netlify if needed:");
  console.log("  AIRTABLE_ANNOUNCEMENTS_TABLE=Announcements");
  if (announcements?.id) console.log(`  # AIRTABLE_ANNOUNCEMENTS_TABLE_ID=${announcements.id}`);
}

main().catch((error) => {
  console.error("\nSetup failed:", error.message || error);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});
