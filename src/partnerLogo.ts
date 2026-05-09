// Partner / club logo generator.
//
// Produces an inline SVG lockup for a third-party brand (typically a coach's
// affiliated club or scouting network — e.g. PurePro Elite for Hope). The
// output is a self-contained <svg> string that can be dropped straight into
// JSX via `dangerouslySetInnerHTML` or rendered as a React component.
//
// THIS IS THE CORE OF THE FUTURE LOGO STUDIO IN /admin. When we ship the
// in-product editor that lets coaches generate their own watermark, the
// editor will call `buildPartnerLogo()` with the user-entered config and
// preview the result live. Everything in this file is shaped around being
// driven by a future form, not just by hard-coded values.
//
// Design language: mirrors the G2P brand mark (lime rounded square, dark
// green letters) but inverted so the partner reads as a distinct, equal
// brand rather than a sub-brand of Grass2Pro. The wordmark uses the same
// font stack as the rest of the app for consistency.

export type PartnerLogoConfig = {
  // Two-or-three-letter monogram for the square mark. Auto-derived from the
  // brand name if omitted (first letter of each significant word, max 3).
  monogram?: string;
  // Brand wordmark. Rendered uppercase with letter-spacing.
  brandName: string;
  // Optional supporting line under the wordmark, also uppercase, smaller and
  // muted. e.g. "Talent Pathway", "Performance Football".
  tagline?: string;
  // Hex colour driving the mark + tagline accents. Defaults to G2P lime so
  // the partner sits inside the same visual system. Coaches will be able to
  // override this in the future Logo Studio.
  accent?: string;
  // Hex colour for the mark's monogram glyph + the wordmark on dark
  // surfaces. Defaults to the deep G2P green for crispness on the lime.
  ink?: string;
  // Hex colour for the wordmark when rendered on a dark surface (the only
  // surface we currently render on \u2014 the coach landing header). Light/dark
  // variants can be added once we surface this on light backgrounds too.
  wordmarkColor?: string;
  // Visual style. "wordmark-with-mark" (default) shows monogram square +
  // wordmark side-by-side. "mark-only" hides the wordmark for tight spaces.
  // "wordmark-only" hides the square \u2014 useful as a small footer mark.
  style?: "wordmark-with-mark" | "mark-only" | "wordmark-only";
};

const DEFAULTS: Required<Omit<PartnerLogoConfig, "monogram" | "tagline">> = {
  brandName: "",
  accent: "#c9e970",
  ink: "#1a2110",
  wordmarkColor: "#f3f5ee",
  style: "wordmark-with-mark",
};

// Derive a monogram from a brand name. "PurePro Elite" \u2192 "PE",
// "Tottenham Hotspur" \u2192 "TH", "FC United Manchester" \u2192 "FUM" (capped at 3
// letters so the square mark stays legible at small sizes).
function deriveMonogram(brandName: string): string {
  const significant = brandName
    .split(/\s+/)
    .filter((word) => word.length > 0 && !/^(of|the|and|&)$/i.test(word));
  const letters = significant.map((word) => word[0]?.toUpperCase() ?? "").join("");
  return letters.slice(0, 3) || brandName.slice(0, 2).toUpperCase();
}

// Build the SVG string. Pure function, no DOM access, safe to call during
// SSR or to use inside dangerouslySetInnerHTML.
export function buildPartnerLogo(config: PartnerLogoConfig): string {
  const cfg = { ...DEFAULTS, ...config };
  const monogram = config.monogram ?? deriveMonogram(cfg.brandName);
  const showMark = cfg.style !== "wordmark-only";
  const showWordmark = cfg.style !== "mark-only";

  // Layout constants. The SVG is 200\u00d750 viewBox so it renders at any pixel
  // size while keeping the mark and wordmark in proportion. Coaches don't
  // need to think about pixels \u2014 CSS sets the rendered size via height.
  const VB_W = 200;
  const VB_H = 50;
  const MARK_SIZE = 38;
  const MARK_X = 0;
  const MARK_Y = 6;
  const MARK_RADIUS = 9;
  const WORDMARK_X = showMark ? MARK_SIZE + 12 : 0;

  const fontStack =
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  // Monogram inside the mark. We size by character count so 2-letter and
  // 3-letter monograms both feel balanced inside the square.
  const monogramFontSize = monogram.length >= 3 ? 13 : 16;
  const monogramLetterSpacing = monogram.length >= 3 ? 0.5 : 0.8;

  const markSvg = showMark
    ? `<g>
        <rect
          x="${MARK_X}" y="${MARK_Y}"
          width="${MARK_SIZE}" height="${MARK_SIZE}"
          rx="${MARK_RADIUS}" ry="${MARK_RADIUS}"
          fill="${cfg.accent}"
        />
        <text
          x="${MARK_X + MARK_SIZE / 2}"
          y="${MARK_Y + MARK_SIZE / 2}"
          dominant-baseline="central"
          text-anchor="middle"
          font-family="${fontStack}"
          font-weight="900"
          font-size="${monogramFontSize}"
          letter-spacing="${monogramLetterSpacing}"
          fill="${cfg.ink}"
        >${escapeXml(monogram)}</text>
      </g>`
    : "";

  // Wordmark + optional tagline stack. We use precise y values so the
  // wordmark vertical-centres against the mark, and the tagline sits on
  // its own baseline two lines below.
  const wordmarkTextY = config.tagline ? 24 : 31;
  const wordmark = showWordmark
    ? `<text
        x="${WORDMARK_X}" y="${wordmarkTextY}"
        font-family="${fontStack}"
        font-weight="800"
        font-size="14"
        letter-spacing="1.5"
        fill="${cfg.wordmarkColor}"
      >${escapeXml(cfg.brandName.toUpperCase())}</text>`
    : "";
  const tagline = config.tagline && showWordmark
    ? `<text
        x="${WORDMARK_X}" y="40"
        font-family="${fontStack}"
        font-weight="600"
        font-size="9"
        letter-spacing="2.4"
        fill="${cfg.accent}"
        opacity="0.85"
      >${escapeXml(config.tagline.toUpperCase())}</text>`
    : "";

  // The viewBox is fixed but the rendered width can flex via CSS. Setting
  // preserveAspectRatio="xMinYMid meet" anchors the lockup to the left edge
  // so it sits correctly when CSS rounds the SVG to a wider available box.
  return `<svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 ${VB_W} ${VB_H}"
    preserveAspectRatio="xMinYMid meet"
    role="img"
    aria-label="${escapeXml(cfg.brandName)}${config.tagline ? ` \u2014 ${escapeXml(config.tagline)}` : ""}"
  >
    ${markSvg}
    ${wordmark}
    ${tagline}
  </svg>`;
}

// Minimal XML escape \u2014 we only need to handle the characters that would
// break SVG parsing. Brand names and taglines come from a trusted config
// today, but the future Logo Studio will accept arbitrary user input.
function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
