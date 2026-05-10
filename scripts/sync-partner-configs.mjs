#!/usr/bin/env node
//
// sync-partner-configs.mjs — local CLI to overlay Logo Studio partner
// configs from Airtable into src/coachProfiles.ts.
//
// Workflow (until Phase G ships a runtime fetch in /c/:slug):
//
//   1. Coach (or Cobby on behalf of coach) tweaks the brand in the
//      Logo Studio at /admin/logo-studio.
//   2. They click "Save to my profile" — that posts the JSON to the
//      coach-partner-update Netlify Function which patches the
//      "Partner Config" field on the matching Coaches row in Airtable.
//   3. Before the next Netlify deploy, Cobby runs:
//
//        npm run sync:partners
//
//      …which calls this script. It reads every Coaches row, parses the
//      Partner Config JSON, and rewrites the matching `partner: { ... }`
//      block in src/coachProfiles.ts so the static profile data stays
//      the source of truth /c/:slug already reads from.
//   4. Cobby reviews the git diff, commits, pushes. Netlify auto-deploys.
//
// Why a local script rather than a build-time Netlify step?
//   - Build-time fetches at every deploy couple Netlify to Airtable and
//     would slow every push, including unrelated changes.
//   - Running it locally means Cobby sees the diff BEFORE it ships —
//     a saved Partner Config is reviewable like any other code change.
//   - When Phase G lands and /c/:slug fetches from Airtable directly,
//     this script becomes unnecessary and we delete it.
//
// Requirements:
//   - AIRTABLE_TOKEN (or AIRTABLE_API_KEY) and AIRTABLE_BASE_ID set in
//     the local shell or a .env file. The script does NOT read .env
//     automatically — keep it explicit so credentials never leak via a
//     forgotten env file. Use: `AIRTABLE_TOKEN=pat... npm run sync:partners`.
//
// Safety:
//   - The script is idempotent. Running it twice with no Airtable
//     changes produces zero diff.
//   - It writes to src/coachProfiles.ts in-place and prints a summary
//     of what changed. If you don't like the result, `git checkout --
//     src/coachProfiles.ts` reverts.
//   - It only touches coaches that EXIST in both Airtable AND
//     coachProfiles.ts. New Airtable rows without a matching static
//     entry are reported as "skipped (no static profile)" so you can
//     add them by hand.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const COACH_PROFILES_PATH = resolve(__dirname, "..", "src", "coachProfiles.ts");

const AIRTABLE_API = "https://api.airtable.com/v0";
const COACHES_TABLE_ID = "tblb7EEVuRBz1BeA5"; // mirrors TABLE_IDS.COACHES

function envToken() {
  return process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY;
}

function requireEnv() {
  const token = envToken();
  const baseId = process.env.AIRTABLE_BASE_ID;
  if (!token || !baseId) {
    console.error(
      "Missing AIRTABLE_TOKEN (or AIRTABLE_API_KEY) and/or AIRTABLE_BASE_ID.\n" +
        "Run with the env vars set, e.g.:\n" +
        "  AIRTABLE_TOKEN=pat... AIRTABLE_BASE_ID=app... npm run sync:partners",
    );
    process.exit(1);
  }
  return { token, baseId };
}

// Pull every Coaches row. The base has a small number of coaches so a
// single page is fine; we still page defensively in case the dataset
// grows past Airtable's 100-row default page size.
async function fetchAllCoaches({ token, baseId }) {
  const rows = [];
  let offset;
  do {
    const url = new URL(`${AIRTABLE_API}/${baseId}/${COACHES_TABLE_ID}`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Airtable Coaches list failed (${response.status}): ${body}`,
      );
    }
    const payload = await response.json();
    rows.push(...(payload.records || []));
    offset = payload.offset;
  } while (offset);
  return rows;
}

// Extract a slug from a Coaches row. We honour an explicit "Slug" field
// if it exists; otherwise we derive from "Full Name" (lower-case,
// dash-separated). This mirrors how /c/:slug URLs are typed — short and
// human — and keeps the script's matching forgiving rather than strict.
function slugFromRow(row) {
  const explicit = row?.fields?.Slug;
  if (typeof explicit === "string" && explicit.trim()) {
    return explicit.trim().toLowerCase();
  }
  const name = row?.fields?.["Full Name"] || row?.fields?.Name || "";
  if (!name) return null;
  return String(name)
    .toLowerCase()
    .trim()
    .split(/\s+/)[0]; // first name is the convention (matches "hope")
}

// Parse the Partner Config JSON. Airtable returns it as a string from
// a long-text field; we accept either a string or (defensively) an
// already-parsed object in case the field type is ever changed.
function parsePartnerConfig(row) {
  const raw = row?.fields?.["Partner Config"];
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    console.warn(
      `  ! Could not parse Partner Config for record ${row.id}: ${error.message}`,
    );
    return null;
  }
}

// Pretty-print a partner config as a TypeScript object literal that
// matches the existing coachProfiles.ts style — 4-space indented inside
// the coach entry, double-quoted strings, trailing commas on each line.
// We deliberately re-serialise rather than splice JSON in verbatim so
// the file stays valid TS (no { "key": ... } object-literal-with-quoted-
// keys mismatch with the surrounding style).
function renderPartnerLiteral(partner, indent) {
  const pad = " ".repeat(indent);
  const padInner = " ".repeat(indent + 2);
  const lines = ["{"];
  const orderedKeys = [
    "brandName",
    "monogram",
    "tagline",
    "accent",
    "ink",
    "wordmarkColor",
    "taglineColor",
    "outlineColor",
    "outlineWidth",
    "style",
    "shape",
    "accentGradient",
    "href",
  ];
  for (const key of orderedKeys) {
    if (!(key in partner)) continue;
    const value = partner[key];
    if (value === undefined || value === null) continue;
    if (typeof value === "string") {
      lines.push(`${padInner}${key}: ${JSON.stringify(value)},`);
    } else if (typeof value === "number" || typeof value === "boolean") {
      lines.push(`${padInner}${key}: ${value},`);
    } else {
      // accentGradient is the only nested object; JSON-stringify with
      // 2-space indent then re-indent by the inner pad so it nests
      // cleanly inside the partner block.
      const nested = JSON.stringify(value, null, 2)
        .split("\n")
        .map((line, idx) => (idx === 0 ? line : padInner + line))
        .join("\n");
      lines.push(`${padInner}${key}: ${nested},`);
    }
  }
  lines.push(`${pad}}`);
  return lines.join("\n");
}

// Replace the partner block for a specific coach slug in the
// coachProfiles.ts source. The matching is anchored to the slug literal
// `slug: "<slug>"` so other coaches' partner blocks are untouched. We
// walk balanced braces to find the end of the partner: { ... } block —
// a regex won't do because the partner block may contain nested braces
// (e.g. accentGradient: { kind: ..., stops: [...] }).
function replacePartnerForSlug(source, slug, partner) {
  const slugMatch = source.match(
    new RegExp(`(slug:\\s*"${slug}"[\\s\\S]*?)(partner:\\s*\\{)`),
  );
  if (!slugMatch) {
    return { source, status: "no-partner-block" };
  }
  const partnerStartIndex = slugMatch.index + slugMatch[1].length;
  const braceOpenIndex = source.indexOf("{", partnerStartIndex);
  // Walk braces to find the matching close. Strings in TS literals may
  // contain `{` / `}` legitimately, so we track whether we're inside a
  // string with single, double, or backtick quotes.
  let depth = 0;
  let i = braceOpenIndex;
  let inString = null;
  for (; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) break;
    }
  }
  if (depth !== 0) {
    return { source, status: "unbalanced-braces" };
  }
  // Determine the indent of `partner:` so the replacement matches
  // surrounding style.
  const lineStart = source.lastIndexOf("\n", partnerStartIndex) + 1;
  const indentText = source.slice(lineStart, partnerStartIndex);
  const indent = indentText.length;
  const literal = renderPartnerLiteral(partner, indent);
  const before = source.slice(0, partnerStartIndex);
  const after = source.slice(i + 1); // skip the closing `}` we matched
  const next = `${before}partner: ${literal}${after}`;
  if (next === source) {
    return { source, status: "unchanged" };
  }
  return { source: next, status: "updated" };
}

async function main() {
  const env = requireEnv();
  console.log("Fetching coaches from Airtable…");
  const rows = await fetchAllCoaches(env);
  console.log(`  ${rows.length} coach row(s) found.`);

  let source = readFileSync(COACH_PROFILES_PATH, "utf8");
  const original = source;

  const updated = [];
  const skipped = [];
  const unchanged = [];
  const noStatic = [];

  for (const row of rows) {
    const slug = slugFromRow(row);
    if (!slug) {
      skipped.push({ id: row.id, reason: "no slug" });
      continue;
    }
    const partner = parsePartnerConfig(row);
    if (!partner) {
      skipped.push({ id: row.id, slug, reason: "no Partner Config" });
      continue;
    }
    if (!source.includes(`slug: "${slug}"`)) {
      noStatic.push(slug);
      continue;
    }
    const result = replacePartnerForSlug(source, slug, partner);
    if (result.status === "updated") {
      source = result.source;
      updated.push(slug);
    } else if (result.status === "unchanged") {
      unchanged.push(slug);
    } else {
      skipped.push({ id: row.id, slug, reason: result.status });
    }
  }

  if (source !== original) {
    writeFileSync(COACH_PROFILES_PATH, source);
    console.log(
      `\n✓ Wrote ${updated.length} update(s) to src/coachProfiles.ts:`,
    );
    for (const slug of updated) console.log(`    - ${slug}`);
  } else {
    console.log("\nNo changes to src/coachProfiles.ts — already in sync.");
  }

  if (unchanged.length > 0) {
    console.log(
      `\n${unchanged.length} coach(es) already up to date: ${unchanged.join(", ")}`,
    );
  }
  if (noStatic.length > 0) {
    console.log(
      `\n${noStatic.length} Airtable coach(es) without a matching static profile (add them to coachProfiles.ts by hand):`,
    );
    for (const slug of noStatic) console.log(`    - ${slug}`);
  }
  if (skipped.length > 0) {
    console.log(`\n${skipped.length} row(s) skipped:`);
    for (const entry of skipped) {
      const slugLabel = entry.slug ? ` (${entry.slug})` : "";
      console.log(`    - ${entry.id}${slugLabel}: ${entry.reason}`);
    }
  }

  console.log("\nNext: `git diff src/coachProfiles.ts` to review, then commit + push.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
