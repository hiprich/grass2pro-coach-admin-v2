import type { AccentGradient, PartnerFontStyle, PartnerLogoConfig, PartnerLogoShape } from "./partnerLogo";
import { isPartnerFontStyle } from "./partnerLogo";
import { normalizeHexColor } from "./hexColor";

export const LOGO_STUDIO_STORAGE_VERSION = 1 as const;

/** Must match Logo Studio `FormState` (flat primitives only). */
export type LogoStudioPersistedForm = {
  brandName: string;
  monogramOverride: string;
  tagline: string;
  accent: string;
  customHex: string;
  gradientPresetId: string | null;
  style: NonNullable<PartnerLogoConfig["style"]>;
  shape: PartnerLogoShape;
  autoInk: boolean;
  manualInk: string;
  proMode: boolean;
  outlineWidth: number;
  outlineColor: string;
  wordmarkMode: "accent" | "white" | "custom";
  wordmarkCustom: string;
  taglineMode: "accent" | "white" | "custom";
  taglineCustom: string;
  fontStyle: PartnerFontStyle;
};

export type LogoStudioDraftPayload = {
  v: typeof LOGO_STUDIO_STORAGE_VERSION;
  savedAt: number;
  form: LogoStudioPersistedForm;
};

export function logoStudioStorageKey(normalisedEmail: string): string {
  return `g2p:logoStudio:draft:v${LOGO_STUDIO_STORAGE_VERSION}:${normalisedEmail.trim().toLowerCase()}`;
}

export function loadLogoStudioDraft(normalisedEmail: string): LogoStudioDraftPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(logoStudioStorageKey(normalisedEmail));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LogoStudioDraftPayload;
    if (!parsed || parsed.v !== LOGO_STUDIO_STORAGE_VERSION || !parsed.form || typeof parsed.form !== "object") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveLogoStudioDraft(normalisedEmail: string, form: LogoStudioPersistedForm): void {
  if (typeof window === "undefined") return;
  try {
    const payload: LogoStudioDraftPayload = {
      v: LOGO_STUDIO_STORAGE_VERSION,
      savedAt: Date.now(),
      form,
    };
    window.localStorage.setItem(logoStudioStorageKey(normalisedEmail), JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

// --- Pride preset (must match Logo Studio GRADIENT_PRESETS[0] exactly) ---
const PRIDE_COLORS = ["#e40303", "#ff8c00", "#ffed00", "#008026", "#004dff", "#750787"] as const;

function accentIsPrideGradient(g: AccentGradient | undefined): boolean {
  if (!g || g.kind !== "stripes" || !Array.isArray(g.colors)) return false;
  if (g.colors.length !== PRIDE_COLORS.length) return false;
  return g.colors.every((c, i) => normalizeHexColor(String(c)) === normalizeHexColor(PRIDE_COLORS[i]));
}

// Accent preset list (must match Logo Studio ACCENT_PRESETS `.value` strings)
const KNOWN_ACCENT_HEXES = new Set([
  "#c9e970",
  "#2f7f3a",
  "#1d4ed8",
  "#1e3a8a",
  "#14b8a6",
  "#b91c1c",
  "#ea580c",
  "#facc15",
  "#ec4899",
  "#8b5cf6",
  "#0b0d0a",
  "#ffffff",
]);

function autoInkFor(hex: string): string {
  const norm = normalizeHexColor(hex);
  const h = norm || hex.trim();
  const m = /^#?([a-f0-9]{6})$/i.exec(h);
  if (!m) return "#1a2110";
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 140 ? "#1a2110" : "#ffffff";
}

/**
 * Map saved partner config (Airtable / copy JSON) into Logo Studio form fields.
 * Returns a partial patch; caller should merge with defaults / existing state.
 */
export function partnerConfigToPersistedForm(partner: Partial<PartnerLogoConfig>): Partial<LogoStudioPersistedForm> {
  const out: Partial<LogoStudioPersistedForm> = {};

  if (typeof partner.brandName === "string") out.brandName = partner.brandName;

  if (typeof partner.monogram === "string") out.monogramOverride = partner.monogram;

  if (typeof partner.tagline === "string") out.tagline = partner.tagline;

  if (partner.style === "wordmark-with-mark" || partner.style === "mark-only" || partner.style === "wordmark-only") {
    out.style = partner.style;
  }

  if (
    partner.shape === "squircle" ||
    partner.shape === "circle" ||
    partner.shape === "rectangle" ||
    partner.shape === "oval" ||
    partner.shape === "triangle" ||
    partner.shape === "hexagon"
  ) {
    out.shape = partner.shape;
  }

  if (partner.fontStyle && isPartnerFontStyle(partner.fontStyle)) {
    out.fontStyle = partner.fontStyle;
  }

  const gradient = partner.accentGradient;
  if (accentIsPrideGradient(gradient)) {
    out.gradientPresetId = "pride";
    out.customHex = "";
    out.accent = "#c9e970";
  } else {
    out.gradientPresetId = null;
    const a = normalizeHexColor(partner.accent);
    if (a) {
      if (KNOWN_ACCENT_HEXES.has(a)) {
        out.accent = a;
        out.customHex = "";
      } else {
        out.accent = "#c9e970";
        out.customHex = a;
      }
    }
  }

  const resolvedAccent =
    out.gradientPresetId === "pride"
      ? "#c9e970"
      : normalizeHexColor(out.customHex?.trim() || "") || out.accent || "#c9e970";

  if (typeof partner.ink === "string") {
    const ink = normalizeHexColor(partner.ink) || partner.ink.trim();
    const expected = autoInkFor(resolvedAccent);
    out.autoInk = ink.toLowerCase() === expected.toLowerCase();
    out.manualInk = ink;
  }

  const ow = partner.outlineWidth;
  if (typeof ow === "number" && ow > 0) {
    out.outlineWidth = ow;
    out.outlineColor = normalizeHexColor(partner.outlineColor) || partner.outlineColor || "#0b0d0a";
    out.proMode = true;
  }

  const wc = normalizeHexColor(partner.wordmarkColor);
  if (wc) {
    const acc = normalizeHexColor(resolvedAccent) || resolvedAccent;
    if (wc === "#f3f5ee") {
      out.wordmarkMode = "white";
      out.wordmarkCustom = "#f3f5ee";
    } else if (acc && wc.toLowerCase() === acc.toLowerCase()) {
      out.wordmarkMode = "accent";
      out.wordmarkCustom = "#f3f5ee";
    } else {
      out.wordmarkMode = "custom";
      out.wordmarkCustom = wc;
    }
    out.proMode = true;
  }

  const tc = partner.taglineColor ? normalizeHexColor(partner.taglineColor) : null;
  if (tc) {
    const acc = normalizeHexColor(resolvedAccent) || resolvedAccent;
    if (tc === "#f3f5ee") {
      out.taglineMode = "white";
      out.taglineCustom = "#facc15";
    } else if (acc && tc.toLowerCase() === acc.toLowerCase()) {
      out.taglineMode = "accent";
      out.taglineCustom = "#facc15";
    } else {
      out.taglineMode = "custom";
      out.taglineCustom = tc;
    }
    out.proMode = true;
  }

  return out;
}
