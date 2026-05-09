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
// Auth: surface mounts at /admin/logo-studio. Same auth posture as
// /admin (none yet — pending Phase G magic-link), so don't surface this
// publicly until Phase G ships.

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AccentGradient,
  PartnerLogoConfig,
  PartnerLogoShape,
} from "./partnerLogo";
import { buildPartnerLogo } from "./partnerLogo";
import ColourPopover from "./ColourPopover";

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
  // Form state. Defaults seed the studio with Hope's PurePro Elite config
  // so the first preview is something recognisable rather than a blank
  // square. Coaches can clear and start over.
  const [brandName, setBrandName] = useState("PurePro Elite");
  const [monogramOverride, setMonogramOverride] = useState("");
  const [tagline, setTagline] = useState("Talent Pathway");
  const [accent, setAccent] = useState(ACCENT_PRESETS[0].value);
  const [customHex, setCustomHex] = useState("");
  // When a gradient preset is selected, it takes precedence over the
  // solid accent for the mark silhouette. Picking any solid swatch or
  // typing a custom hex clears the gradient. `null` = solid mode.
  const [gradientPresetId, setGradientPresetId] = useState<string | null>(null);
  const [style, setStyle] = useState<Style>("wordmark-with-mark");
  const [shape, setShape] = useState<PartnerLogoShape>("squircle");
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
  };
  const [undoStack, setUndoStack] = useState<FormState[]>([]);
  // Ref used to suppress snapshot pushes while we're applying an undo —
  // otherwise the restored state would itself be pushed onto the stack,
  // making undo a no-op on the next tap.
  const isRestoringRef = useRef(false);
  // Latest snapshot that we've already pushed. Compared against the
  // current state when the debounce fires; equal means nothing
  // meaningfully changed (e.g. the user typed a letter and then deleted
  // it within the debounce window) so we skip pushing.
  const lastSnapshotRef = useRef<FormState | null>(null);

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
    ],
  );

  // Seed the baseline snapshot once on mount so that the very first edit
  // pushes the initial state and undo can roll back to the defaults.
  useEffect(() => {
    lastSnapshotRef.current = currentState;
    // We deliberately depend on nothing — this runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced push: schedule a snapshot 400ms after the latest change. If
  // another change arrives, the timer resets so we only push when the
  // user pauses. We push the *previous* snapshot (lastSnapshotRef) so
  // that the stack contains pre-edit states and undo restores them.
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
    }, 400);
    return () => clearTimeout(id);
  }, [currentState]);

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
      brandName: brandName.trim() || "Your Brand",
      style,
      shape,
      accent: resolvedAccent,
      ink: resolvedInk,
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
  async function handleCopyConfig() {
    setCopyState("idle");
    const partnerConfig: Record<string, unknown> = {
      brandName: config.brandName,
      monogram: config.monogram,
      tagline: config.tagline,
      accent: config.accent,
      ink: config.ink,
      style: config.style,
      shape: config.shape,
    };
    if (config.accentGradient) {
      partnerConfig.accentGradient = config.accentGradient;
    }
    if (config.wordmarkColor) partnerConfig.wordmarkColor = config.wordmarkColor;
    if (config.taglineColor) partnerConfig.taglineColor = config.taglineColor;
    if (config.outlineWidth) {
      partnerConfig.outlineWidth = config.outlineWidth;
      partnerConfig.outlineColor = config.outlineColor;
    }
    const text = JSON.stringify(partnerConfig, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 1800);
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
          <button
            type="button"
            className="logo-studio-undo"
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
        </div>
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
        <section className="logo-studio-form" aria-label="Logo settings">
          <fieldset className="logo-studio-fieldset">
            <legend>Brand</legend>
            <label className="logo-studio-field">
              <span>Brand name</span>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g. PurePro Elite"
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
                placeholder="e.g. Talent Pathway"
                data-testid="input-tagline"
                maxLength={32}
              />
            </label>
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
                    onClick={() =>
                      setActivePicker(
                        activePicker === "accent" ? null : "accent",
                      )
                    }
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
                  onClick={() => setStyle(opt.value)}
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
                  onClick={() => setShape(opt.value)}
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
                    onClick={() => setOutlineWidth(opt.value)}
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
                the coach explicitly picks White or a custom hex. */}
            <fieldset className="logo-studio-fieldset">
              <legend>Tagline colour</legend>
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
          {exportError && (
            <p className="logo-studio-error" role="alert">
              {exportError}
            </p>
          )}

          <details className="logo-studio-details">
            <summary>What does “Copy config JSON” do?</summary>
            <p>
              It puts a small JSON snippet on your clipboard with this exact
              brand setup. Send it to your Grass2Pro contact and we'll wire
              it onto your coach page as your partner lockup. Phase G will
              replace this with a one-tap “save to my profile” button.
            </p>
          </details>
        </section>
      </main>
    </div>
  );
}
