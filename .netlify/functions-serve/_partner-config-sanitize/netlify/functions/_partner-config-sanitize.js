var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// netlify/functions/_partner-config-sanitize.mjs
var partner_config_sanitize_exports = {};
__export(partner_config_sanitize_exports, {
  ALLOWED_FONT_STYLES: () => ALLOWED_FONT_STYLES,
  ALLOWED_PARTNER_KEYS: () => ALLOWED_PARTNER_KEYS,
  MAX_PARTNER_CONFIG_BYTES: () => MAX_PARTNER_CONFIG_BYTES,
  sanitisePartnerPayload: () => sanitisePartnerPayload
});
module.exports = __toCommonJS(partner_config_sanitize_exports);
var MAX_PARTNER_CONFIG_BYTES = 8 * 1024;
var ALLOWED_PARTNER_KEYS = /* @__PURE__ */ new Set([
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
  "fontStyle"
]);
var ALLOWED_FONT_STYLES = /* @__PURE__ */ new Set([
  "general-sans",
  "satoshi",
  "inter",
  "mono",
  "signature",
  "calligraphy"
]);
function sanitisePartnerPayload(input) {
  if (!input || typeof input !== "object") return null;
  const out = {};
  for (const key of Object.keys(input)) {
    if (!ALLOWED_PARTNER_KEYS.has(key)) continue;
    const value = input[key];
    if (value === void 0 || value === null) continue;
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ALLOWED_FONT_STYLES,
  ALLOWED_PARTNER_KEYS,
  MAX_PARTNER_CONFIG_BYTES,
  sanitisePartnerPayload
});
//# sourceMappingURL=_partner-config-sanitize.js.map
