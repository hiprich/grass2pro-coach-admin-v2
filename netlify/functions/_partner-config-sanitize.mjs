// Shared sanitiser for Partner Logo Studio JSON persisted to Airtable
// "Partner Config". Used by coach-partner-update (admin code) and
// coach-partner-save (signed-in coach session).

export const MAX_PARTNER_CONFIG_BYTES = 8 * 1024;

export const ALLOWED_PARTNER_KEYS = new Set([
  "brandName",
  "monogram",
  "tagline",
  "accent",
  "accentGradient",
  "ink",
  "wordmarkColor",
  "taglineColor",
  "outlineColor",
  "outlineWidth",
  "style",
  "shape",
  "fontStyle",
]);

export const ALLOWED_FONT_STYLES = new Set([
  "general-sans",
  "satoshi",
  "inter",
  "mono",
  "signature",
  "calligraphy",
]);

/** @returns {Record<string, unknown> | null} */
export function sanitisePartnerPayload(input) {
  if (!input || typeof input !== "object") return null;
  const out = {};
  for (const key of Object.keys(input)) {
    if (!ALLOWED_PARTNER_KEYS.has(key)) continue;
    const value = input[key];
    if (value === undefined || value === null) continue;
    if (key === "accentGradient") {
      if (typeof value !== "object" || Array.isArray(value)) continue;
      out[key] = value;
      continue;
    }
    if (key === "fontStyle") {
      if (typeof value !== "string" || !ALLOWED_FONT_STYLES.has(value)) continue;
      out[key] = value;
      continue;
    }
    out[key] = value;
  }
  if (typeof out.brandName !== "string" || out.brandName.trim() === "") {
    return null;
  }
  return out;
}
