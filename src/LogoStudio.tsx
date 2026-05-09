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
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [exportError, setExportError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

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
        <a
          className="logo-studio-back"
          href="/admin"
          data-testid="link-studio-to-admin"
        >
          ← Coach dashboard
        </a>
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
            <label className="logo-studio-field">
              <span>
                Custom hex <em>(overrides preset)</em>
              </span>
              <input
                type="text"
                value={customHex}
                onChange={(e) => {
                  setCustomHex(e.target.value);
                  // Typing a custom hex implies solid mode — drop any
                  // active gradient so the preview reflects the input.
                  if (e.target.value.trim()) setGradientPresetId(null);
                }}
                placeholder="#1d4ed8"
                data-testid="input-custom-hex"
                maxLength={7}
                spellCheck={false}
              />
            </label>

            {/* Gradient presets \u2014 sit below the solid swatches so the
                primary path stays one-click solid colour, but coaches /
                clubs that want a flag-style mark (Pride today, others
                later) can pick one with a single tap. Selecting clears
                the solid accent's active state but keeps the underlying
                accent value so the tagline still gets a coherent colour. */}
            <div className="logo-studio-gradients">
              <span className="logo-studio-gradients-label">
                Or pick a gradient
              </span>
              <div
                className="logo-studio-gradient-list"
                role="radiogroup"
                aria-label="Gradient presets"
              >
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
                      onClick={() =>
                        setGradientPresetId(isActive ? null : preset.id)
                      }
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
        </section>

        {/* Preview + export column */}
        <section className="logo-studio-preview-col" aria-label="Preview and export">
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
