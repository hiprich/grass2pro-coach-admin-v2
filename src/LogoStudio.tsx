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
import type { PartnerLogoConfig } from "./partnerLogo";
import { buildPartnerLogo } from "./partnerLogo";

// Preset accent colours so non-designers can pick something good without
// thinking. Lime is the default (matches G2P), the rest cover the most
// common UK club crest colours so a Sunday-league coach can almost always
// find a one-click match. Custom hex input is also offered.
const ACCENT_PRESETS: Array<{ label: string; value: string }> = [
  { label: "Grass2Pro Lime", value: "#c9e970" },
  { label: "Pitch Green", value: "#2f7f3a" },
  { label: "Royal Blue", value: "#1d4ed8" },
  { label: "Crimson", value: "#b91c1c" },
  { label: "Sunset Orange", value: "#ea580c" },
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
  const [style, setStyle] = useState<Style>("wordmark-with-mark");
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

  const resolvedInk = autoInk ? autoInkFor(resolvedAccent) : manualInk;

  // Build the SVG once per render. Pure function, cheap.
  const config: PartnerLogoConfig = useMemo(() => {
    const cfg: PartnerLogoConfig = {
      brandName: brandName.trim() || "Your Brand",
      style,
      accent: resolvedAccent,
      ink: resolvedInk,
    };
    const m = monogramOverride.trim().toUpperCase();
    if (m) cfg.monogram = m.slice(0, 3);
    const t = tagline.trim();
    if (t) cfg.tagline = t;
    return cfg;
  }, [brandName, monogramOverride, tagline, style, resolvedAccent, resolvedInk]);

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
    const partnerConfig = {
      brandName: config.brandName,
      monogram: config.monogram,
      tagline: config.tagline,
      accent: config.accent,
      ink: config.ink,
      style: config.style,
    };
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
              {ACCENT_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  className={`logo-studio-swatch ${
                    accent === preset.value && !customHex ? "is-active" : ""
                  }`}
                  style={{ background: preset.value }}
                  onClick={() => {
                    setAccent(preset.value);
                    setCustomHex("");
                  }}
                  aria-label={preset.label}
                  aria-pressed={accent === preset.value && !customHex}
                  title={preset.label}
                />
              ))}
            </div>
            <label className="logo-studio-field">
              <span>
                Custom hex <em>(overrides preset)</em>
              </span>
              <input
                type="text"
                value={customHex}
                onChange={(e) => setCustomHex(e.target.value)}
                placeholder="#1d4ed8"
                data-testid="input-custom-hex"
                maxLength={7}
                spellCheck={false}
              />
            </label>
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
