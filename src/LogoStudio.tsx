// Logo Studio — in-product brand watermark generator at /admin/logo-studio.
//
// Lets coaches and clubs generate their own SVG/PNG watermark without
// leaving Grass2Pro. The form drives the same buildPartnerLogo() renderer
// that powers the partner lockup on /c/:slug, so anything Hope creates
// here can drop straight onto his landing page via the partner config
// (brandName + monogram + tagline + accent).
//
// Outputs:
//   - Download SVG (vector, scales forever, ~1KB)
//   - Download PNG (1024x256, transparent background, for WhatsApp/socials)
//   - Copy JSON config (for paste-handoff into a coach's profile until
//     Phase G lands a proper save-to-Airtable flow)
//
// Auth: mounts at `/admin/logo-studio`. When Airtable is live, `/admin` APIs
// require the coach magic-link cookie — unauthenticated visits redirect to
// `/coach` (see bootstrap effect).

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink } from "lucide-react";
import type {
  AccentGradient,
  PartnerFontStyle,
  PartnerLogoConfig,
  PartnerLogoShape,
} from "./partnerLogo";
import { buildPartnerLogo, PARTNER_FONT_OPTIONS } from "./partnerLogo";
import ColourPopover from "./ColourPopover";
import { hasCoachRegistrationLogoAccess } from "./lib/coachRegistrationLogoGate";
import { postCoachAuth } from "./lib/coachAuthClient";
import { LoggedInAsNotice } from "./LoggedInAsNotice";
import type { LogoStudioPersistedForm } from "./logoStudioHydrate";
import { loadLogoStudioDraft, partnerConfigToPersistedForm, saveLogoStudioDraft } from "./logoStudioHydrate";

// Outline thickness presets. Width is in viewBox units; the mark is ~38u
// across so 0/1.5/3 reads as none/thin/thick crest border. Three buttons
// keeps the control one-tap and prevents weird in-between values.
const OUTLINE_PRESETS: Array<{
  value: number;
  label: string;
}> = [
  { value: 0, label: "None" },
  { value: 1.5, label: "Thin" },
  { value: 3, label: "Thick" },
];

// Compact swatch palette reused for outline / wordmark / tagline
// shortcuts. Same hex set as ACCENT_PRESETS but rendered as a smaller
// inline strip beside the "Match accent" / "White" / "Custom" choices.
const MARK_OUTLINE_COLOURS: string[] = [
  "#0b0d0a",
  "#ffffff",
  "#c9e970",
  "#1d4ed8",
  "#b91c1c",
  "#ea580c",
  "#facc15",
  "#ec4899",
  "#8b5cf6",
];

// Choices for the wordmark + tagline colour shortcut control. "accent"
// means inherit the resolved accent at render time. "custom" hands off to
// the colour popover. "white" is a hardcoded shortcut because it's the
// most-requested wordmark on dark backgrounds.
type TextColourMode = "accent" | "white" | "custom";

// Preset accent colours so non-designers can pick something good without
// thinking. Lime is the default (matches G2P), the rest cover the most
// common UK club crest colours plus a wider rainbow set so coaches can
// match almost any kit without dropping into the custom hex field.
// `border` is rendered as a 1px ring on the swatch so near-background
// colours (white, lime on dark) don't disappear into the page.
const ACCENT_PRESETS: Array<{
  label: string;
  value: string;
  border?: string;
}> = [
  { label: "Grass2Pro Lime", value: "#c9e970" },
  { label: "Pitch Green", value: "#2f7f3a" },
  { label: "Royal Blue", value: "#1d4ed8" },
  { label: "Navy", value: "#1e3a8a" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Crimson", value: "#b91c1c" },
  { label: "Sunset Orange", value: "#ea580c" },
  { label: "Yellow", value: "#facc15" },
  { label: "Pink", value: "#ec4899" },
  { label: "Purple", value: "#8b5cf6" },
  { label: "Black", value: "#0b0d0a", border: "#2a2f24" },
  { label: "White", value: "#ffffff", border: "#2a2f24" },
];

// Gradient presets. Today there's exactly one — the classic 6-stripe Pride
// flag — but the data shape is set up for more (bi flag, trans flag,
// custom builder) without restructuring the component.
type GradientPreset = {
  id: string;
  label: string;
  description: string;
  gradient: AccentGradient;
};

const GRADIENT_PRESETS: GradientPreset[] = [
  {
    id: "pride",
    label: "Pride",
    description: "6-stripe rainbow — for LGBTQ+ partners and allyship logos.",
    gradient: {
      kind: "stripes",
      colors: [
        "#e40303", // red
        "#ff8c00", // orange
        "#ffed00", // yellow
        "#008026", // green
        "#004dff", // blue
        "#750787", // purple
      ],
      direction: "vertical",
    },
  },
];

// Ink (text inside the mark) auto-flips between dark green and white based
// on whether the accent is light or dark. Pure helper, runs synchronously.
// Returns "#1a2110" (deep G2P green) for light accents, "#ffffff" for dark
// ones. The threshold is a perceived-luminance approximation — good enough
// for the curated preset list and most user-entered hex values.
function autoInkFor(hex: string): string {
  const m = /^#?([a-f0-9]{6})$/i.exec(hex.trim());
  if (!m) return "#1a2110";
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  // Perceived luminance: see https://www.w3.org/TR/AERT/#color-contrast
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 140 ? "#1a2110" : "#ffffff";
}

type Style = NonNullable<PartnerLogoConfig["style"]>;

const STYLE_OPTIONS: Array<{ value: Style; label: string }> = [
  { value: "wordmark-with-mark", label: "Mark + wordmark" },
  { value: "mark-only", label: "Mark only" },
  { value: "wordmark-only", label: "Wordmark only" },
];

// Shape options shown as a chip selector. Each chip renders a mini SVG
// preview of the shape filled in lime so coaches can pick visually rather
// than reading labels. Order: classic squircle first (familiar), then the
// rest in roughly increasing exoticness.
const SHAPE_OPTIONS: Array<{ value: PartnerLogoShape; label: string; icon: string }> = [
  {
    value: "squircle",
    label: "Squircle",
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" /></svg>',
  },
  {
    value: "circle",
    label: "Circle",
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" /></svg>',
  },
  {
    value: "rectangle",
    label: "Rectangle",
    icon: '<svg viewBox="0 0 28 24" aria-hidden="true"><rect x="1" y="4" width="26" height="16" rx="2" /></svg>',
  },
  {
    value: "oval",
    label: "Oval",
    icon: '<svg viewBox="0 0 28 24" aria-hidden="true"><ellipse cx="14" cy="12" rx="13" ry="8" /></svg>',
  },
  {
    value: "triangle",
    label: "Triangle",
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="12,2 22,21 2,21" /></svg>',
  },
  {
    value: "hexagon",
    label: "Hexagon",
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="12,2 21.66,7.5 21.66,16.5 12,22 2.34,16.5 2.34,7.5" /></svg>',
  },
];

// Slugify the brand name for use as a download filename. Strips
// punctuation, lowercases, replaces whitespace with hyphens. Falls back
// to "logo" if the name is empty or all punctuation.
function slugifyForFilename(brandName: string): string {
  const slug = brandName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "logo";
}

// Trigger a download of a given Blob with a chosen filename. Wraps the
// usual createObjectURL → click → revokeObjectURL dance in one place so
// the SVG and PNG paths share it.
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke on next tick so Safari doesn't cancel the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// Convert the SVG string to a transparent-background PNG via the canvas
// API. We render at 4x the SVG viewBox so the PNG is sharp at typical
// retina display sizes (the SVG viewBox is 200x50 → canvas is 800x200,
// upscaled to 1024x256 by setting an explicit width/height attribute).
async function svgToPngBlob(
  svg: string,
  targetWidth = 1024,
  targetHeight = 256,
): Promise<Blob> {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not load SVG for rasterisation."));
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not available.");
    // Transparent background by default. We deliberately don't fill so
    // the PNG works on any backdrop the coach pastes it onto.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (out) => (out ? resolve(out) : reject(new Error("PNG encoding failed."))),
        "image/png",
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function LogoStudio() {
  // Form starts empty so coaches get a neutral canvas — no club looked "pre-selected".
  const [brandName, setBrandName] = useState("");
  const [monogramOverride, setMonogramOverride] = useState("");
  const [tagline, setTagline] = useState("");
  const [accent, setAccent] = useState(ACCENT_PRESETS[0].value);
  const [customHex, setCustomHex] = useState("");
  // When a gradient preset is selected, it takes precedence over the
  // solid accent for the mark silhouette. Picking any solid swatch or
  // typing a custom hex clears the gradient. `null` = solid mode.
  const [gradientPresetId, setGradientPresetId] = useState<string | null>(null);
  const [style, setStyle] = useState<Style>("wordmark-with-mark");
  const [shape, setShape] = useState<PartnerLogoShape>("squircle");
  const [fontStyle, setFontStyle] = useState<PartnerFontStyle>("general-sans");
  const [autoInk, setAutoInk] = useState(true);
  const [manualInk, setManualInk] = useState("#1a2110");
  // v1.3 — "Pro mode" advanced controls. Collapsed by default so the
  // first-run experience stays clean (Apple instinct: simple by default,
  // depth on tap). When closed, none of the advanced fields are visible
  // even if they hold non-default values — the values are still applied
  // to the preview, which is the right behaviour: open Pro mode → see
  // exactly what's driving the look.
  const [proMode, setProMode] = useState(false);
  const [outlineWidth, setOutlineWidth] = useState(0);
  const [outlineColor, setOutlineColor] = useState("#0b0d0a");
  // Wordmark colour mode. "accent" → use the resolved accent (so the
  // wordmark colour-pairs with the mark). "white" → hardcoded #f3f5ee
  // (the original default). "custom" → a user-picked hex.
  const [wordmarkMode, setWordmarkMode] = useState<TextColourMode>("white");
  const [wordmarkCustom, setWordmarkCustom] = useState("#f3f5ee");
  // Tagline colour mode — default "accent" so the tagline colour-pairs
  // with the mark exactly like before this change (no behaviour drift).
  const [taglineMode, setTaglineMode] = useState<TextColourMode>("accent");
  const [taglineCustom, setTaglineCustom] = useState("#facc15");
  // Which colour control currently owns the popover, if any. Single
  // popover instance — only one picker open at a time.
  const [activePicker, setActivePicker] = useState<
    null | "accent" | "outline" | "wordmark" | "tagline"
  >(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  // Save-to-Airtable state. "idle" → button shows "Save to my profile".
  // "saving" → disabled + "Saving…". "saved" → "Saved ✓" for 1.8s.
  // "error" → red message for 1.8s. Mirrors the copyState ergonomics.
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  /** After a successful save, offer navigation to the coach dashboard or staying here. */
  const [postSaveNavOpen, setPostSaveNavOpen] = useState(false);
  const [loggedInAsName, setLoggedInAsName] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [studioReady, setStudioReady] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const undoHydrationSeededRef = useRef(false);
  /** Last JSON we successfully persisted to Airtable (or demo) via coach-partner-save. */
  const lastRemoteSaveJsonRef = useRef<string | null>(null);
  const autoSaveInFlightRef = useRef(false);
  const isRestoringRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    const apiBaseLocal = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
    const statusUrl = apiBaseLocal
      ? `${apiBaseLocal}/coach-auth-status`
      : `/.netlify/functions/coach-auth-status`;

    function applyPatch(patch: Partial<LogoStudioPersistedForm>) {
      isRestoringRef.current = true;
      if (patch.brandName !== undefined) setBrandName(patch.brandName);
      if (patch.monogramOverride !== undefined) setMonogramOverride(patch.monogramOverride);
      if (patch.tagline !== undefined) setTagline(patch.tagline);
      if (patch.accent !== undefined) setAccent(patch.accent);
      if (patch.customHex !== undefined) setCustomHex(patch.customHex);
      if (patch.gradientPresetId !== undefined) setGradientPresetId(patch.gradientPresetId);
      if (patch.style !== undefined) setStyle(patch.style);
      if (patch.shape !== undefined) setShape(patch.shape);
      if (patch.autoInk !== undefined) setAutoInk(patch.autoInk);
      if (patch.manualInk !== undefined) setManualInk(patch.manualInk);
      if (patch.proMode !== undefined) setProMode(patch.proMode);
      if (patch.outlineWidth !== undefined) setOutlineWidth(patch.outlineWidth);
      if (patch.outlineColor !== undefined) setOutlineColor(patch.outlineColor);
      if (patch.wordmarkMode !== undefined) setWordmarkMode(patch.wordmarkMode);
      if (patch.wordmarkCustom !== undefined) setWordmarkCustom(patch.wordmarkCustom);
      if (patch.taglineMode !== undefined) setTaglineMode(patch.taglineMode);
      if (patch.taglineCustom !== undefined) setTaglineCustom(patch.taglineCustom);
      if (patch.fontStyle !== undefined) setFontStyle(patch.fontStyle);
      isRestoringRef.current = false;
    }

    fetch(statusUrl, { credentials: "include" })
      .then(async (response) => {
        if (cancelled) return;
        if (response.status === 401 || response.status === 403) {
          if (hasCoachRegistrationLogoAccess()) {
            setStudioReady(true);
            return;
          }
          const next = `${window.location.pathname}${window.location.search}`;
          window.location.replace(`/coach?next=${encodeURIComponent(next)}`);
          return;
        }
        if (!response.ok) {
          setStudioReady(true);
          return;
        }
        let body: unknown;
        try {
          body = await response.json();
        } catch {
          setStudioReady(true);
          return;
        }
        if (!body || typeof body !== "object") {
          setStudioReady(true);
          return;
        }
        const b = body as {
          loggedInAs?: unknown;
          sessionEmail?: unknown;
          partner?: unknown;
          demo?: unknown;
        };
        if (typeof b.loggedInAs === "string" && b.loggedInAs.trim()) {
          setLoggedInAsName(b.loggedInAs.trim());
        }
        const email =
          typeof b.sessionEmail === "string" && b.sessionEmail.includes("@")
            ? b.sessionEmail.trim().toLowerCase()
            : null;
        setSessionEmail(email);

        const partner = b.partner && typeof b.partner === "object" ? b.partner : null;
        const serverBrand =
          partner &&
          typeof (partner as { brandName?: unknown }).brandName === "string"
            ? String((partner as { brandName: string }).brandName).trim()
            : "";
        const hasServerPartner = serverBrand.length > 0;

        if (hasServerPartner) {
          applyPatch(partnerConfigToPersistedForm(partner as Partial<PartnerLogoConfig>));
        } else if (email && b.demo !== true) {
          const draft = loadLogoStudioDraft(email);
          if (draft?.form) {
            applyPatch(draft.form);
          }
        }
        setStudioReady(true);
      })
      .catch(() => {
        setStudioReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!postSaveNavOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setPostSaveNavOpen(false);
        setSaveState("idle");
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [postSaveNavOpen]);

  const [exportError, setExportError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  // ---- Undo (v1.4) ---------------------------------------------------------
  // We snapshot every form-driven value into a single FormState object and
  // push a copy onto an undo stack whenever the user pauses for ~400ms.
  // That debouncing matters: typing into Brand name shouldn't push a
  // snapshot per keystroke ("P", "Pu", "Pur"...) — that would make undo
  // useless because one tap rolls back a single letter. We push the
  // pre-edit state, so undo restores what was on screen before the user
  // started fiddling with the latest control. Stack capped at 50 to keep
  // memory bounded; FormState is tiny (~12 strings + a few numbers/bools)
  // so 50 entries is well under 10KB.
  type FormState = {
    brandName: string;
    monogramOverride: string;
    tagline: string;
    accent: string;
    customHex: string;
    gradientPresetId: string | null;
    style: Style;
    shape: PartnerLogoShape;
    autoInk: boolean;
    manualInk: string;
    proMode: boolean;
    outlineWidth: number;
    outlineColor: string;
    wordmarkMode: TextColourMode;
    wordmarkCustom: string;
    taglineMode: TextColourMode;
    taglineCustom: string;
    fontStyle: PartnerFontStyle;
  };
  const [undoStack, setUndoStack] = useState<FormState[]>([]);
  // Latest snapshot that we've already pushed. Compared against the
  // current state when the debounce fires; equal means nothing
  // meaningfully changed (e.g. the user typed a letter and then deleted
  // it within the debounce window) so we skip pushing.
  const lastSnapshotRef = useRef<FormState | null>(null);
  // Live mirror of the current state so we can push synchronous
  // snapshots from event handlers without waiting for React to flush.
  // The debounced effect updates this every render.
  const currentStateRef = useRef<FormState | null>(null);

  const currentState = useMemo<FormState>(
    () => ({
      brandName,
      monogramOverride,
      tagline,
      accent,
      customHex,
      gradientPresetId,
      style,
      shape,
      autoInk,
      manualInk,
      proMode,
      outlineWidth,
      outlineColor,
      wordmarkMode,
      wordmarkCustom,
      taglineMode,
      taglineCustom,
      fontStyle,
    }),
    [
      brandName,
      monogramOverride,
      tagline,
      accent,
      customHex,
      gradientPresetId,
      style,
      shape,
      autoInk,
      manualInk,
      proMode,
      outlineWidth,
      outlineColor,
      wordmarkMode,
      wordmarkCustom,
      taglineMode,
      taglineCustom,
      fontStyle,
    ],
  );

  // After auth + hydration, seed undo baseline from the loaded form once.
  useEffect(() => {
    if (!studioReady || undoHydrationSeededRef.current) return;
    undoHydrationSeededRef.current = true;
    lastSnapshotRef.current = currentState;
    currentStateRef.current = currentState;
  }, [studioReady, currentState]);

  // Keep the live state mirror current every render so flushSnapshot()
  // (called synchronously from event handlers below) can read the
  // pre-update state without waiting for React's commit phase.
  useEffect(() => {
    currentStateRef.current = currentState;
  }, [currentState]);

  // Debounced push: schedule a snapshot 220ms after the latest change.
  // The timer resets on every change so a continuous drag of the colour
  // picker doesn't fragment into dozens of micro-undos. We push the
  // *previous* snapshot (lastSnapshotRef) so the stack contains
  // pre-edit states and undo restores them. 220ms is shorter than v1.4's
  // 400ms so that a single colour drag commits to history quicker —
  // important for the popover where the user expects each settled
  // colour to be one undo step.
  useEffect(() => {
    if (isRestoringRef.current) {
      // Clear the flag and skip pushing — we just restored a snapshot.
      isRestoringRef.current = false;
      lastSnapshotRef.current = currentState;
      return;
    }
    const id = setTimeout(() => {
      const prev = lastSnapshotRef.current;
      if (!prev) {
        lastSnapshotRef.current = currentState;
        return;
      }
      // Cheap deep-equal via JSON — FormState is flat primitives only.
      if (JSON.stringify(prev) === JSON.stringify(currentState)) return;
      setUndoStack((stack) => {
        const next = [...stack, prev];
        // Cap stack at 50 entries — drop oldest first.
        if (next.length > 50) next.shift();
        return next;
      });
      lastSnapshotRef.current = currentState;
    }, 220);
    return () => clearTimeout(id);
  }, [currentState]);

  // Persist in-progress Logo Studio form to localStorage for the signed-in coach
  // so leaving /admin and returning restores fields on this device.
  useEffect(() => {
    if (!studioReady || !sessionEmail) return;
    const id = window.setTimeout(() => {
      saveLogoStudioDraft(sessionEmail, currentState as unknown as LogoStudioPersistedForm);
    }, 550);
    return () => window.clearTimeout(id);
  }, [studioReady, sessionEmail, currentState]);

  // Synchronously flush any pending edit into the undo stack. Called
  // from discrete action handlers (mode buttons, picker open/close) so
  // each meaningful step is its own undo entry. Without this, when the
  // user clicks "Custom" and immediately drags the colour picker, the
  // debounce timer keeps resetting and only one combined snapshot ever
  // gets pushed — so a single undo jumps back past both the mode change
  // AND the drag, which is the bug Cobby reported in v1.5.
  function flushSnapshot() {
    if (isRestoringRef.current) return;
    const live = currentStateRef.current;
    const prev = lastSnapshotRef.current;
    if (!live || !prev) return;
    if (JSON.stringify(prev) === JSON.stringify(live)) return;
    setUndoStack((stack) => {
      const next = [...stack, prev];
      if (next.length > 50) next.shift();
      return next;
    });
    lastSnapshotRef.current = live;
  }

  function applySnapshot(s: FormState) {
    isRestoringRef.current = true;
    setBrandName(s.brandName);
    setMonogramOverride(s.monogramOverride);
    setTagline(s.tagline);
    setAccent(s.accent);
    setCustomHex(s.customHex);
    setGradientPresetId(s.gradientPresetId);
    setStyle(s.style);
    setShape(s.shape);
    setAutoInk(s.autoInk);
    setManualInk(s.manualInk);
    setProMode(s.proMode);
    setOutlineWidth(s.outlineWidth);
    setOutlineColor(s.outlineColor);
    setWordmarkMode(s.wordmarkMode);
    setWordmarkCustom(s.wordmarkCustom);
    setTaglineMode(s.taglineMode);
    setTaglineCustom(s.taglineCustom);
    setFontStyle(s.fontStyle ?? "general-sans");
  }

  function handleUndo() {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const next = stack.slice(0, -1);
      const top = stack[stack.length - 1];
      applySnapshot(top);
      return next;
    });
  }

  // Cmd/Ctrl+Z keyboard shortcut. Skip when focus is inside an editable
  // text field so the browser's native undo on the input still works as
  // expected — coaches typing into Brand name expect Cmd+Z to undo a
  // letter, not the whole field swap.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isUndo =
        (e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "z";
      if (!isUndo) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      const editable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (t?.isContentEditable ?? false);
      if (editable) return;
      e.preventDefault();
      handleUndo();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // handleUndo is a stable closure over setUndoStack/applySnapshot;
    // exhaustive-deps would re-add the listener every render which is
    // fine but wasteful, so we intentionally omit it here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // -------------------------------------------------------------------------

  // Use the data-surface pattern so this page can opt into custom global
  // overrides without bleeding into the rest of admin.
  useEffect(() => {
    const previous = document.documentElement.dataset.surface;
    document.documentElement.dataset.surface = "logo-studio";
    document.title = "Logo Studio — Grass2Pro";
    return () => {
      if (previous === undefined) delete document.documentElement.dataset.surface;
      else document.documentElement.dataset.surface = previous;
    };
  }, []);

  // Resolve the active accent: a custom hex if entered & valid, else the
  // selected preset. Invalid custom hex falls back silently to the preset.
  const resolvedAccent = useMemo(() => {
    const trimmed = customHex.trim();
    if (/^#?[0-9a-f]{6}$/i.test(trimmed)) {
      return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    }
    return accent;
  }, [accent, customHex]);

  // Resolve the active gradient (if any). Memoised so the config object
  // identity stays stable when nothing relevant changes.
  const activeGradient = useMemo<AccentGradient | undefined>(() => {
    if (!gradientPresetId) return undefined;
    return GRADIENT_PRESETS.find((p) => p.id === gradientPresetId)?.gradient;
  }, [gradientPresetId]);

  // Auto-ink: for solid accents we flip dark/light against luminance. For
  // gradients (which mix light + dark stops, e.g. Pride yellow next to
  // Pride purple) we hardcode white — it's the only ink that stays legible
  // across every band of every flag in our preset list.
  const resolvedInk = autoInk
    ? activeGradient
      ? "#ffffff"
      : autoInkFor(resolvedAccent)
    : manualInk;

  // Resolve wordmark + tagline colours from their mode + custom values.
  // "accent" branches return undefined for the override so the renderer
  // falls back to its built-in inheritance (wordmark uses the existing
  // light wordmarkColor default, tagline inherits accent).
  const resolvedWordmarkColor = useMemo<string | undefined>(() => {
    if (wordmarkMode === "white") return "#f3f5ee";
    if (wordmarkMode === "custom") return wordmarkCustom;
    // "accent" — use the resolved accent so the wordmark colour-pairs
    // with the mark on dark surfaces. The light-bg preview overrides
    // this with its own dark colour for legibility.
    return resolvedAccent;
  }, [wordmarkMode, wordmarkCustom, resolvedAccent]);

  const resolvedTaglineColor = useMemo<string | undefined>(() => {
    if (taglineMode === "accent") return undefined; // renderer inherits
    if (taglineMode === "white") return "#f3f5ee";
    return taglineCustom;
  }, [taglineMode, taglineCustom]);

  // Build the SVG once per render. Pure function, cheap.
  const config: PartnerLogoConfig = useMemo(() => {
    const cfg: PartnerLogoConfig = {
      brandName: brandName.trim(),
      style,
      shape,
      accent: resolvedAccent,
      ink: resolvedInk,
      fontStyle,
    };
    if (activeGradient) cfg.accentGradient = activeGradient;
    if (resolvedWordmarkColor) cfg.wordmarkColor = resolvedWordmarkColor;
    if (resolvedTaglineColor) cfg.taglineColor = resolvedTaglineColor;
    if (outlineWidth > 0) {
      cfg.outlineWidth = outlineWidth;
      cfg.outlineColor = outlineColor;
    }
    const m = monogramOverride.trim().toUpperCase();
    if (m) cfg.monogram = m.slice(0, 3);
    const t = tagline.trim();
    if (t) cfg.tagline = t;
    return cfg;
  }, [
    brandName,
    monogramOverride,
    tagline,
    style,
    shape,
    fontStyle,
    resolvedAccent,
    resolvedInk,
    activeGradient,
    resolvedWordmarkColor,
    resolvedTaglineColor,
    outlineWidth,
    outlineColor,
  ]);

  const svg = useMemo(() => buildPartnerLogo(config), [config]);

  // Download SVG.
  function handleDownloadSvg() {
    setExportError(null);
    try {
      const filename = `${slugifyForFilename(config.brandName)}.svg`;
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      downloadBlob(blob, filename);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Could not generate SVG.");
    }
  }

  // Download PNG.
  async function handleDownloadPng() {
    setExportError(null);
    try {
      const png = await svgToPngBlob(svg, 1024, 256);
      const filename = `${slugifyForFilename(config.brandName)}@1024.png`;
      downloadBlob(png, filename);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Could not generate PNG.");
    }
  }

  // Copy a JSON config that can be pasted straight into a coach's
  // partner config (e.g. coachProfiles.ts → coach.partner). Phase G will
  // replace this with a proper "save to my profile" button once coach
  // profiles live in Airtable.
  // Build the same sanitised partner-config payload that Copy JSON
  // produces, but as an object (the Save handler stringifies it itself).
  // Pulled out as a helper so Copy and Save can never drift apart in
  // what fields they include — both call this and read the same shape.
  function buildPartnerConfigPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      brandName: config.brandName,
      monogram: config.monogram,
      tagline: config.tagline,
      accent: config.accent,
      ink: config.ink,
      style: config.style,
      shape: config.shape,
      fontStyle: config.fontStyle,
    };
    if (config.accentGradient) payload.accentGradient = config.accentGradient;
    if (config.wordmarkColor) payload.wordmarkColor = config.wordmarkColor;
    if (config.taglineColor) payload.taglineColor = config.taglineColor;
    if (config.outlineWidth) {
      payload.outlineWidth = config.outlineWidth;
      payload.outlineColor = config.outlineColor;
    }
    return payload;
  }

  const partnerSavePayloadJson = useMemo(
    () => JSON.stringify(buildPartnerConfigPayload()),
    [config],
  );

  // Debounced save to the signed-in coach's Airtable row so "Partner Config"
  // is the source of truth across devices and sessions (local draft is cache).
  useEffect(() => {
    if (!studioReady || !sessionEmail) return;
    if (!config.brandName.trim()) return;
    if (partnerSavePayloadJson === lastRemoteSaveJsonRef.current) return;

    const id = window.setTimeout(() => {
      if (partnerSavePayloadJson === lastRemoteSaveJsonRef.current) return;
      if (autoSaveInFlightRef.current) return;
      autoSaveInFlightRef.current = true;
      void fetch("/api/coach-partner-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          partner: JSON.parse(partnerSavePayloadJson) as Record<string, unknown>,
        }),
      })
        .then(async (response) => {
          if (!response.ok) return;
          lastRemoteSaveJsonRef.current = partnerSavePayloadJson;
        })
        .finally(() => {
          autoSaveInFlightRef.current = false;
        });
    }, 1200);

    return () => window.clearTimeout(id);
  }, [studioReady, sessionEmail, config.brandName, partnerSavePayloadJson]);

  // Manual save to Airtable (same endpoint as background sync).
  async function handleSaveToProfile() {
    if (!config.brandName.trim()) {
      setSaveState("error");
      setSaveErrorMessage("Add a brand name before saving.");
      window.setTimeout(() => {
        setSaveState("idle");
        setSaveErrorMessage(null);
      }, 1800);
      return;
    }

    setSaveState("saving");
    setSaveErrorMessage(null);
    try {
      const payload = buildPartnerConfigPayload();
      const response = await fetch("/api/coach-partner-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ partner: payload }),
      });
      if (response.status === 401) {
        setSaveState("error");
        setSaveErrorMessage(
          "Sign in from the coach dashboard to save to your profile.",
        );
        window.setTimeout(() => {
          setSaveState("idle");
          setSaveErrorMessage(null);
        }, 2200);
        return;
      }
      if (!response.ok) {
        let detail = "";
        try {
          const body = (await response.json()) as { error?: string };
          detail = body?.error || "";
        } catch {
          /* non-JSON */
        }
        setSaveState("error");
        setSaveErrorMessage(detail || "Save failed. Try again in a moment.");
        window.setTimeout(() => {
          setSaveState("idle");
          setSaveErrorMessage(null);
        }, 2800);
        return;
      }
      lastRemoteSaveJsonRef.current = JSON.stringify(payload);
      setSaveState("saved");
      setPostSaveNavOpen(true);
    } catch (error) {
      console.error("Logo Studio save failed:", error);
      setSaveState("error");
      setSaveErrorMessage("Network error. Check your connection.");
      window.setTimeout(() => {
        setSaveState("idle");
        setSaveErrorMessage(null);
      }, 2800);
    }
  }

  async function handleCopyConfig() {
    setCopyState("idle");
    const text = JSON.stringify(buildPartnerConfigPayload(), null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 1800);
    }
  }

  async function handleCoachSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await postCoachAuth("sign-out");
      window.location.replace("/coach");
    } catch (error) {
      console.error("[logo-studio] Sign out failed:", error);
      setSigningOut(false);
    }
  }

  return (
    <div className="logo-studio" data-testid="logo-studio">
      <header className="logo-studio-topbar">
        <div className="logo-studio-topbar-row">
          <a
            className="logo-studio-back"
            href="/admin"
            data-testid="link-studio-to-admin"
          >
            ← Coach dashboard
          </a>
          <div className="logo-studio-topbar-actions">
            {/* Phase G will derive this slug from the signed-in coach's profile. */}
            <a
              className="logo-studio-public-link"
              href="/c/hope"
              target="_blank"
              rel="noopener"
              data-testid="link-studio-to-public-page"
            >
              <span>View my public page</span>
              <ExternalLink size={14} aria-hidden="true" />
            </a>
            <button
              type="button"
              className="logo-studio-sign-out"
              onClick={() => {
                void handleCoachSignOut();
              }}
              disabled={signingOut}
              aria-busy={signingOut}
              data-testid="button-studio-sign-out"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
        {loggedInAsName ? <LoggedInAsNotice name={loggedInAsName} variant="studio" /> : null}
        <div className="logo-studio-title-block">
          <h1 className="logo-studio-title">Logo Studio</h1>
          <p className="logo-studio-subtitle">
            Generate a brand watermark for your club or partner. Download as
            SVG or PNG, or copy the config to use it as a partner lockup
            on your Grass2Pro coach page.
          </p>
        </div>
      </header>

      <main className="logo-studio-grid">
        {/* Form column */}
        <section
          className={`logo-studio-form${!studioReady ? " logo-studio-form--loading" : ""}`}
          aria-label="Logo settings"
          aria-busy={!studioReady}
        >
          {!studioReady ? (
            <p className="logo-studio-loading-hint" role="status">
              Loading your saved logo settings…
            </p>
          ) : null}
          <div className={!studioReady ? "logo-studio-form-ghost" : undefined}>
          <fieldset className="logo-studio-fieldset">
            <legend>Brand</legend>
            <label className="logo-studio-field">
              <span>Brand name</span>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g. Riverside Youth FC"
                autoComplete="off"
                spellCheck={false}
                data-testid="input-brand-name"
                maxLength={48}
              />
            </label>
            <label className="logo-studio-field">
              <span>
                Monogram override <em>(optional, 2–3 letters)</em>
              </span>
              <input
                type="text"
                value={monogramOverride}
                onChange={(e) => setMonogramOverride(e.target.value)}
                placeholder="Auto from brand name"
                autoComplete="off"
                spellCheck={false}
                data-testid="input-monogram"
                maxLength={3}
              />
            </label>
            <label className="logo-studio-field">
              <span>
                Tagline <em>(optional)</em>
              </span>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Elite small-group pathway"
                autoComplete="off"
                spellCheck={false}
                data-testid="input-tagline"
                maxLength={32}
              />
            </label>
          </fieldset>

          <fieldset className="logo-studio-fieldset">
            <legend>Typography</legend>
            <p className="logo-studio-field-hint">
              Applies to the monogram, wordmark, and tagline. General Sans and Satoshi are the same families as the Grass2Pro coach app (loaded on this
              page).
            </p>
            <div className="logo-studio-fonts" role="radiogroup" aria-label="Logo font">
              {PARTNER_FONT_OPTIONS.map((opt) => {
                const isActive = fontStyle === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`logo-studio-font-btn ${isActive ? "is-active" : ""}`}
                    onClick={() => {
                      flushSnapshot();
                      setFontStyle(opt.id);
                    }}
                    aria-pressed={isActive}
                    title={opt.hint}
                    data-testid={`btn-font-${opt.id}`}
                  >
                    <span className="logo-studio-font-btn-label">{opt.label}</span>
                    <span className="logo-studio-font-btn-hint">{opt.hint}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="logo-studio-fieldset">
            <legend>Accent colour</legend>
            <div className="logo-studio-swatches" role="radiogroup">
              {ACCENT_PRESETS.map((preset) => {
                const isActive =
                  !gradientPresetId &&
                  accent === preset.value &&
                  !customHex;
                // Near-background colours (pure white, near-black) need a
                // visible inner ring so the swatch reads as a chip not a
                // hole. We use a modifier class so the active-state
                // box-shadow (lime ring) doesn't get clobbered by an
                // inline style override.
                const className = [
                  "logo-studio-swatch",
                  preset.border ? "logo-studio-swatch--bordered" : "",
                  isActive ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <button
                    key={preset.value}
                    type="button"
                    className={className}
                    style={{ background: preset.value }}
                    onClick={() => {
                      flushSnapshot();
                      setAccent(preset.value);
                      setCustomHex("");
                      setGradientPresetId(null);
                    }}
                    aria-label={preset.label}
                    aria-pressed={isActive}
                    title={preset.label}
                    data-testid={`btn-accent-${preset.label
                      .toLowerCase()
                      .replace(/\s+/g, "-")}`}
                  />
                );
              })}
            </div>
            {/* Gradient presets + custom picker \u2014 sit below the solid
                swatches so the primary path stays one-click solid colour.
                The Custom chip opens a full HSV picker; picking from it
                drops gradient mode and applies the picked hex as the
                solid accent. */}
            <div className="logo-studio-gradients">
              <span className="logo-studio-gradients-label">
                Or pick a gradient / custom colour
              </span>
              <div
                className="logo-studio-gradient-list"
                role="radiogroup"
                aria-label="Gradient and custom colour presets"
              >
                <div className="logo-studio-gradient-btn-wrap">
                  <button
                    type="button"
                    className={`logo-studio-gradient-btn ${
                      customHex && !gradientPresetId ? "is-active" : ""
                    }`}
                    onClick={() => {
                      flushSnapshot();
                      setActivePicker(
                        activePicker === "accent" ? null : "accent",
                      );
                    }}
                    aria-pressed={activePicker === "accent"}
                    aria-haspopup="dialog"
                    aria-expanded={activePicker === "accent"}
                    data-testid="btn-accent-custom"
                    title="Pick any custom colour with hue + saturation"
                  >
                    <span
                      className="logo-studio-gradient-swatch logo-studio-gradient-swatch--custom"
                      style={{
                        background: customHex || resolvedAccent,
                      }}
                      aria-hidden="true"
                    />
                    <span className="logo-studio-gradient-label">Custom</span>
                  </button>
                  {activePicker === "accent" && (
                    <ColourPopover
                      title="Custom accent"
                      value={customHex || resolvedAccent}
                      onChange={(hex) => {
                        setCustomHex(hex);
                        setGradientPresetId(null);
                      }}
                      onClose={() => setActivePicker(null)}
                    />
                  )}
                </div>
                {GRADIENT_PRESETS.map((preset) => {
                  const isActive = gradientPresetId === preset.id;
                  // Build a CSS linear-gradient mirroring the SVG output
                  // for the chip preview \u2014 hard-edge bands for stripes,
                  // smooth blend otherwise.
                  const stops =
                    preset.gradient.kind === "stripes"
                      ? preset.gradient.colors
                          .map((c, i, arr) => {
                            const start = (i / arr.length) * 100;
                            const end = ((i + 1) / arr.length) * 100;
                            return `${c} ${start}%, ${c} ${end}%`;
                          })
                          .join(", ")
                      : preset.gradient.colors.join(", ");
                  const angle =
                    preset.gradient.direction === "horizontal"
                      ? "to right"
                      : preset.gradient.direction === "diagonal"
                        ? "135deg"
                        : "to bottom";
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`logo-studio-gradient-btn ${
                        isActive ? "is-active" : ""
                      }`}
                      onClick={() => {
                        flushSnapshot();
                        setGradientPresetId(isActive ? null : preset.id);
                        // Clear any active custom hex when switching
                        // into a gradient — the gradient owns the mark.
                        if (!isActive) setCustomHex("");
                      }}
                      aria-pressed={isActive}
                      data-testid={`btn-gradient-${preset.id}`}
                      title={preset.description}
                    >
                      <span
                        className="logo-studio-gradient-swatch"
                        style={{
                          backgroundImage: `linear-gradient(${angle}, ${stops})`,
                        }}
                        aria-hidden="true"
                      />
                      <span className="logo-studio-gradient-label">
                        {preset.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </fieldset>

          <fieldset className="logo-studio-fieldset">
            <legend>Mark text colour</legend>
            <label className="logo-studio-field-inline">
              <input
                type="checkbox"
                checked={autoInk}
                onChange={(e) => setAutoInk(e.target.checked)}
                data-testid="input-auto-ink"
              />
              <span>Auto (flips dark/light for contrast)</span>
            </label>
            {!autoInk && (
              <label className="logo-studio-field">
                <span>Hex</span>
                <input
                  type="text"
                  value={manualInk}
                  onChange={(e) => setManualInk(e.target.value)}
                  placeholder="#1a2110"
                  maxLength={7}
                  spellCheck={false}
                />
              </label>
            )}
          </fieldset>

          <fieldset className="logo-studio-fieldset">
            <legend>Style</legend>
            <div className="logo-studio-styles">
              {STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`logo-studio-style-btn ${
                    style === opt.value ? "is-active" : ""
                  }`}
                  onClick={() => {
                    flushSnapshot();
                    setStyle(opt.value);
                  }}
                  aria-pressed={style === opt.value}
                  data-testid={`btn-style-${opt.value}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Mark shape \u2014 disabled when the wordmark-only style is
              selected, since there's no mark to shape in that case. */}
          <fieldset
            className="logo-studio-fieldset"
            disabled={style === "wordmark-only"}
          >
            <legend>Mark shape</legend>
            <div className="logo-studio-shapes" role="radiogroup">
              {SHAPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`logo-studio-shape-btn ${
                    shape === opt.value ? "is-active" : ""
                  }`}
                  onClick={() => {
                    flushSnapshot();
                    setShape(opt.value);
                  }}
                  aria-pressed={shape === opt.value}
                  aria-label={opt.label}
                  title={opt.label}
                  data-testid={`btn-shape-${opt.value}`}
                >
                  <span
                    className="logo-studio-shape-icon"
                    dangerouslySetInnerHTML={{ __html: opt.icon }}
                  />
                  <span className="logo-studio-shape-label">{opt.label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          {/* Pro mode \u2014 advanced controls hidden behind a disclosure so
              the first-run form stays one-page and unintimidating. Apple
              instinct: simple by default, depth on tap. When closed, the
              underlying values still apply to the preview, so the user
              isn't surprised by a sudden style shift on toggling. */}
          <details
            className="logo-studio-pro"
            open={proMode}
            onToggle={(e) => setProMode((e.target as HTMLDetailsElement).open)}
            data-testid="logo-studio-pro"
          >
            <summary className="logo-studio-pro-summary">
              <span className="logo-studio-pro-summary-label">Pro mode</span>
              <span className="logo-studio-pro-summary-hint">
                outline, wordmark colour, tagline colour
              </span>
            </summary>

            {/* Outline — None / Thin / Thick + a swatch row for the
                stroke colour. Disabled when the wordmark-only style is
                selected (no mark to outline). */}
            <fieldset
              className="logo-studio-fieldset"
              disabled={style === "wordmark-only"}
            >
              <legend>Mark outline</legend>
              <div className="logo-studio-styles">
                {OUTLINE_PRESETS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`logo-studio-style-btn ${
                      outlineWidth === opt.value ? "is-active" : ""
                    }`}
                    onClick={() => {
                      flushSnapshot();
                      setOutlineWidth(opt.value);
                    }}
                    aria-pressed={outlineWidth === opt.value}
                    data-testid={`btn-outline-${opt.label.toLowerCase()}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {outlineWidth > 0 && (
                <>
                  <div
                    className="logo-studio-mini-swatches"
                    role="radiogroup"
                    aria-label="Outline colour"
                  >
                    {MARK_OUTLINE_COLOURS.map((hex) => {
                      const isActive =
                        outlineColor.toLowerCase() === hex.toLowerCase();
                      const needsBorder =
                        hex.toLowerCase() === "#ffffff" ||
                        hex.toLowerCase() === "#0b0d0a";
                      const cls = [
                        "logo-studio-swatch",
                        "logo-studio-swatch--mini",
                        needsBorder ? "logo-studio-swatch--bordered" : "",
                        isActive ? "is-active" : "",
                      ]
                        .filter(Boolean)
                        .join(" ");
                      return (
                        <button
                          key={hex}
                          type="button"
                          className={cls}
                          style={{ background: hex }}
                          onClick={() => setOutlineColor(hex)}
                          aria-pressed={isActive}
                          aria-label={`Outline colour ${hex}`}
                          title={hex}
                        />
                      );
                    })}
                    <div className="logo-studio-gradient-btn-wrap">
                      <button
                        type="button"
                        className={`logo-studio-swatch logo-studio-swatch--mini logo-studio-swatch--custom ${
                          activePicker === "outline" ? "is-active" : ""
                        }`}
                        style={{ background: outlineColor }}
                        onClick={() =>
                          setActivePicker(
                            activePicker === "outline" ? null : "outline",
                          )
                        }
                        aria-haspopup="dialog"
                        aria-expanded={activePicker === "outline"}
                        aria-label="Custom outline colour"
                        title="Custom outline colour"
                      >
                        <span className="logo-studio-swatch-custom-mark">
                          …
                        </span>
                      </button>
                      {activePicker === "outline" && (
                        <ColourPopover
                          title="Outline colour"
                          value={outlineColor}
                          onChange={(hex) => setOutlineColor(hex)}
                          onClose={() => setActivePicker(null)}
                        />
                      )}
                    </div>
                  </div>
                </>
              )}
            </fieldset>

            {/* Wordmark colour — Match accent / White / Custom shortcut
                row. Custom opens the popover (same component as accent
                custom) and the picked hex feeds into wordmarkCustom. */}
            <fieldset className="logo-studio-fieldset">
              <legend>Wordmark colour</legend>
              <div className="logo-studio-styles">
                {([
                  { id: "accent", label: "Match accent" },
                  { id: "white", label: "White" },
                  { id: "custom", label: "Custom" },
                ] as Array<{ id: TextColourMode; label: string }>).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`logo-studio-style-btn ${
                      wordmarkMode === opt.id ? "is-active" : ""
                    }`}
                    onClick={() => {
                      flushSnapshot();
                      setWordmarkMode(opt.id);
                      if (opt.id === "custom") setActivePicker("wordmark");
                      else if (activePicker === "wordmark")
                        setActivePicker(null);
                    }}
                    aria-pressed={wordmarkMode === opt.id}
                    data-testid={`btn-wordmark-${opt.id}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {wordmarkMode === "custom" && (
                <div className="logo-studio-gradient-btn-wrap">
                  <button
                    type="button"
                    className="logo-studio-swatch-trigger"
                    onClick={() =>
                      setActivePicker(
                        activePicker === "wordmark" ? null : "wordmark",
                      )
                    }
                    aria-haspopup="dialog"
                    aria-expanded={activePicker === "wordmark"}
                    style={{ background: wordmarkCustom }}
                  >
                    <span>{wordmarkCustom}</span>
                  </button>
                  {activePicker === "wordmark" && (
                    <ColourPopover
                      title="Wordmark colour"
                      value={wordmarkCustom}
                      onChange={(hex) => setWordmarkCustom(hex)}
                      onClose={() => setActivePicker(null)}
                    />
                  )}
                </div>
              )}
            </fieldset>

            {/* Tagline colour — same shortcut row pattern. Default mode
                is "accent" so behaviour is unchanged from v1.2 unless
                the coach explicitly picks White or a custom hex.
                v1.5: Undo button lives in this card's header so coaches
                can rewind their last change without scrolling back to
                the top. Tagline colour was chosen because it tends to
                be the last thing coaches tweak before exporting — if
                they second-guess a choice, undo is right there. */}
            <fieldset className="logo-studio-fieldset logo-studio-fieldset--with-action">
              <legend>Tagline colour</legend>
              <button
                type="button"
                className="logo-studio-undo logo-studio-undo--in-card"
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                aria-label={`Undo${undoStack.length ? ` (${undoStack.length} step${undoStack.length === 1 ? "" : "s"})` : ""}`}
                title="Undo last change (⌘Z)"
                data-testid="btn-undo"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 14L4 9l5-5" />
                  <path d="M4 9h11a5 5 0 0 1 0 10h-4" />
                </svg>
                <span className="logo-studio-undo-label">Undo</span>
                {undoStack.length > 0 && (
                  <span className="logo-studio-undo-count" aria-hidden="true">
                    {undoStack.length}
                  </span>
                )}
              </button>
              <div className="logo-studio-styles">
                {([
                  { id: "accent", label: "Match accent" },
                  { id: "white", label: "White" },
                  { id: "custom", label: "Custom" },
                ] as Array<{ id: TextColourMode; label: string }>).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`logo-studio-style-btn ${
                      taglineMode === opt.id ? "is-active" : ""
                    }`}
                    onClick={() => {
                      // Flush before mode change so undo can step back to
                      // "before I clicked Custom" as one entry, then
                      // separately undo subsequent colour drags.
                      flushSnapshot();
                      setTaglineMode(opt.id);
                      if (opt.id === "custom") setActivePicker("tagline");
                      else if (activePicker === "tagline")
                        setActivePicker(null);
                    }}
                    aria-pressed={taglineMode === opt.id}
                    data-testid={`btn-tagline-${opt.id}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {taglineMode === "custom" && (
                <div className="logo-studio-gradient-btn-wrap">
                  <button
                    type="button"
                    className="logo-studio-swatch-trigger"
                    onClick={() =>
                      setActivePicker(
                        activePicker === "tagline" ? null : "tagline",
                      )
                    }
                    aria-haspopup="dialog"
                    aria-expanded={activePicker === "tagline"}
                    style={{ background: taglineCustom }}
                  >
                    <span>{taglineCustom}</span>
                  </button>
                  {activePicker === "tagline" && (
                    <ColourPopover
                      title="Tagline colour"
                      value={taglineCustom}
                      onChange={(hex) => setTaglineCustom(hex)}
                      onClose={() => setActivePicker(null)}
                    />
                  )}
                </div>
              )}
            </fieldset>
          </details>
          </div>
        </section>

        {/* Preview + export column */}
        <section className="logo-studio-preview-col" aria-label="Preview and export">
          {/* The dark preview is wrapped in a sticky container so that on
              narrow screens (where the layout collapses to a single column)
              the live preview stays pinned to the top of the viewport while
              the user scrolls through the form below. On desktop the whole
              preview-col is already sticky, so this wrapper is a no-op
              there. */}
          <div className="logo-studio-preview-sticky">
            <div
              ref={previewRef}
              className="logo-studio-preview logo-studio-preview-dark"
              data-testid="preview-dark"
            >
              <span className="logo-studio-preview-label">On dark background</span>
              <div
                className="logo-studio-preview-svg"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            </div>
          </div>

          <div
            className="logo-studio-preview logo-studio-preview-light"
            data-testid="preview-light"
          >
            <span className="logo-studio-preview-label">On light background</span>
            <div
              className="logo-studio-preview-svg"
              // Re-build with a dark wordmark colour so it stays legible
              // on the white card. Mark + tagline accents stay coloured.
              dangerouslySetInnerHTML={{
                __html: buildPartnerLogo({
                  ...config,
                  wordmarkColor: "#11140e",
                }),
              }}
            />
          </div>

          <div className="logo-studio-actions">
            <button
              type="button"
              className="logo-studio-btn logo-studio-btn-primary"
              onClick={handleDownloadSvg}
              data-testid="btn-download-svg"
            >
              Download SVG
            </button>
            <button
              type="button"
              className="logo-studio-btn logo-studio-btn-primary"
              onClick={handleDownloadPng}
              data-testid="btn-download-png"
            >
              Download PNG (1024×256)
            </button>
            <button
              type="button"
              className="logo-studio-btn logo-studio-btn-secondary"
              onClick={handleCopyConfig}
              data-testid="btn-copy-config"
            >
              {copyState === "copied"
                ? "Copied ✓"
                : copyState === "error"
                ? "Copy failed"
                : "Copy config JSON"}
            </button>
          </div>

          {/* Save-to-profile: session cookie + coach-partner-save → signed-in coach row. */}
          <div className="logo-studio-save" data-testid="logo-studio-save">
            <p className="logo-studio-save-hint">
              Changes are saved to your coach profile while you&apos;re signed in (
              {sessionEmail ? "syncing in the background" : "sign in from Coach dashboard to sync"}
              ). Use the button for an immediate save confirmation.
            </p>
            <button
              type="button"
              className="logo-studio-btn logo-studio-btn-primary logo-studio-save-btn"
              onClick={handleSaveToProfile}
              disabled={saveState === "saving"}
              data-testid="btn-save-to-profile"
            >
              {saveState === "saving"
                ? "Saving…"
                : saveState === "saved"
                ? "Saved ✓"
                : saveState === "error"
                ? "Save failed"
                : "Save to my profile"}
            </button>
          </div>
          {saveErrorMessage && saveState !== "saving" && (
            <p
              className="logo-studio-error"
              role="alert"
              data-testid="save-error"
            >
              {saveErrorMessage}
            </p>
          )}

          {exportError && (
            <p className="logo-studio-error" role="alert">
              {exportError}
            </p>
          )}

          <details className="logo-studio-details">
            <summary>What do the export options do?</summary>
            <p>
              <strong>Download SVG / PNG</strong> — exports the badge as a
              file you can use anywhere (kit, social, print).
            </p>
            <p>
              <strong>Copy config JSON</strong> — puts the brand setup on
              your clipboard so you can share it manually with your Grass2Pro
              contact.
            </p>
            <p>
              <strong>Save to my profile</strong> — writes the current setup to
              your Grass2Pro coach record (signed-in session). Your coach dashboard
              and public page use these colours and the lockup when you next load
              them.
            </p>
          </details>
        </section>
      </main>

      {typeof document !== "undefined" &&
        postSaveNavOpen &&
        createPortal(
          <div
            className="logo-studio-postsave"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logo-studio-postsave-title"
            data-testid="logo-studio-postsave-dialog"
          >
            <button
              type="button"
              className="logo-studio-postsave-backdrop"
              aria-label="Stay on Logo Studio"
              onClick={() => {
                setPostSaveNavOpen(false);
                setSaveState("idle");
              }}
            />
            <div className="logo-studio-postsave-card">
              <h2 id="logo-studio-postsave-title" className="logo-studio-postsave-title">
                Saved to your profile
              </h2>
              <p className="logo-studio-postsave-text">
                Your logo is stored. Would you like to open the Coach dashboard or keep editing here?
              </p>
              <div className="logo-studio-postsave-actions">
                <a
                  className="logo-studio-btn logo-studio-btn-primary"
                  href="/admin"
                  data-testid="postsave-go-dashboard"
                >
                  Go to Coach dashboard
                </a>
                <button
                  type="button"
                  className="logo-studio-btn logo-studio-btn-secondary"
                  onClick={() => {
                    setPostSaveNavOpen(false);
                    setSaveState("idle");
                  }}
                  data-testid="postsave-stay"
                >
                  Stay on Logo Studio
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
