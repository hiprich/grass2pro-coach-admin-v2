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
  // Mark shape. Grassroots clubs use a wild range of crest silhouettes \u2014
  // not just rounded squares \u2014 so the studio offers six common picks.
  // Defaults to "squircle" (the original lime tile) so existing partner
  // configs render unchanged.
  //   - squircle:  rounded square, the original (matches the G2P brand mark)
  //   - circle:    classic medallion / coin
  //   - rectangle: 1.4:1 horizontal banner, common on academy crests
  //   - oval:      stretched medallion, vintage Sunday-league vibe
  //   - triangle:  point-up pennant, used by lots of youth clubs
  //   - hexagon:   honeycomb crest, popular with newer brands
  shape?: PartnerLogoShape;
};

export type PartnerLogoShape =
  | "squircle"
  | "circle"
  | "rectangle"
  | "oval"
  | "triangle"
  | "hexagon";

const DEFAULTS: Required<Omit<PartnerLogoConfig, "monogram" | "tagline">> = {
  brandName: "",
  accent: "#c9e970",
  ink: "#1a2110",
  wordmarkColor: "#f3f5ee",
  style: "wordmark-with-mark",
  shape: "squircle",
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

// Per-shape geometry. Each shape defines its bounding box width/height
// (so wider shapes can push the wordmark right), the SVG path that paints
// the silhouette, and where the monogram label should sit. Splitting it
// out like this keeps buildPartnerLogo() readable as we add more shapes.
type ShapeGeometry = {
  width: number;
  height: number;
  // SVG element string for the silhouette. fill is interpolated separately.
  silhouette: (fill: string) => string;
  // Where the monogram <text> centres inside the mark. Some shapes (notably
  // triangles) need the label nudged off the geometric centre so it sits in
  // the visually weighted region.
  labelCx: number;
  labelCy: number;
  // Some shapes (triangle) feel better with a slightly smaller monogram so
  // it doesn't crowd the edges.
  fontScale?: number;
};

function shapeGeometry(
  shape: PartnerLogoShape,
  size: number,
  yOffset: number,
): ShapeGeometry {
  // For square-footprint shapes the mark width equals the mark height. For
  // rectangle and oval we widen to 1.4:1 so they read as deliberately
  // horizontal rather than "squashed circles". The 1.4 ratio matches the
  // golden-ratio-ish aspect that most academy crests use in the wild.
  const wideRatio = 1.4;

  switch (shape) {
    case "squircle": {
      const radius = 9;
      return {
        width: size,
        height: size,
        silhouette: (fill) =>
          `<rect x="0" y="${yOffset}" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${fill}" />`,
        labelCx: size / 2,
        labelCy: yOffset + size / 2,
      };
    }
    case "circle": {
      const r = size / 2;
      return {
        width: size,
        height: size,
        silhouette: (fill) =>
          `<circle cx="${r}" cy="${yOffset + r}" r="${r}" fill="${fill}" />`,
        labelCx: r,
        labelCy: yOffset + r,
      };
    }
    case "rectangle": {
      const w = size * wideRatio;
      const radius = 4;
      return {
        width: w,
        height: size,
        silhouette: (fill) =>
          `<rect x="0" y="${yOffset}" width="${w}" height="${size}" rx="${radius}" ry="${radius}" fill="${fill}" />`,
        labelCx: w / 2,
        labelCy: yOffset + size / 2,
      };
    }
    case "oval": {
      const w = size * wideRatio;
      const rx = w / 2;
      const ry = size / 2;
      return {
        width: w,
        height: size,
        silhouette: (fill) =>
          `<ellipse cx="${rx}" cy="${yOffset + ry}" rx="${rx}" ry="${ry}" fill="${fill}" />`,
        labelCx: rx,
        labelCy: yOffset + ry,
      };
    }
    case "triangle": {
      // Equilateral pointing up, inscribed in a `size` x `size` box.
      // The visual weight (and the widest section to fit a label) is in the
      // bottom third, so the monogram is nudged down from geometric centre.
      const apex = `${size / 2},${yOffset}`;
      const left = `0,${yOffset + size}`;
      const right = `${size},${yOffset + size}`;
      return {
        width: size,
        height: size,
        silhouette: (fill) =>
          `<polygon points="${apex} ${right} ${left}" fill="${fill}" />`,
        labelCx: size / 2,
        labelCy: yOffset + size * 0.62, // weighted toward the wide base
        fontScale: 0.85,
      };
    }
    case "hexagon": {
      // Regular hexagon with flat sides on left/right (point-up vertices
      // at top and bottom). Inscribed in `size` x `size`. The flat-top
      // orientation reads more like a crest than a honeycomb cell.
      const cx = size / 2;
      const cy = yOffset + size / 2;
      const r = size / 2;
      // Six vertices at 30, 90, 150, 210, 270, 330 degrees \u2014 starting at
      // the top point so two vertical sides flank the monogram.
      const points: string[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i + Math.PI / 2; // start at top
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
      }
      return {
        width: size,
        height: size,
        silhouette: (fill) =>
          `<polygon points="${points.join(" ")}" fill="${fill}" />`,
        labelCx: cx,
        labelCy: cy,
      };
    }
  }
}

// Build the SVG string. Pure function, no DOM access, safe to call during
// SSR or to use inside dangerouslySetInnerHTML.
export function buildPartnerLogo(config: PartnerLogoConfig): string {
  const cfg = { ...DEFAULTS, ...config };
  const monogram = config.monogram ?? deriveMonogram(cfg.brandName);
  const showMark = cfg.style !== "wordmark-only";
  const showWordmark = cfg.style !== "mark-only";

  // Layout constants. The viewBox height stays fixed at 50 so the lockup
  // height is consistent across shapes; the viewBox width grows when the
  // mark is a wide shape (rectangle, oval) so the wordmark doesn't collide
  // with it. Coaches don't need to think about pixels \u2014 CSS sets the
  // rendered size via height.
  const VB_H = 50;
  const MARK_SIZE = 38;
  const MARK_Y = 6;
  const fontStack =
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  const geom = shapeGeometry(cfg.shape, MARK_SIZE, MARK_Y);
  const markRenderedWidth = showMark ? geom.width : 0;
  const WORDMARK_X = showMark ? markRenderedWidth + 12 : 0;

  // viewBox grows so wider shapes don't crowd the wordmark. We give the
  // wordmark ~160 units of right-side space (matches the original layout)
  // when present, else trim tightly around the mark.
  const wordmarkSpace = showWordmark ? 160 : 0;
  const VB_W = WORDMARK_X + wordmarkSpace || markRenderedWidth;

  // Monogram inside the mark. Sized by character count so 2-letter and
  // 3-letter monograms both feel balanced. Triangle gets a slight scale-down
  // so it doesn't kiss the slanted edges.
  const baseFontSize = monogram.length >= 3 ? 13 : 16;
  const monogramFontSize = baseFontSize * (geom.fontScale ?? 1);
  const monogramLetterSpacing = monogram.length >= 3 ? 0.5 : 0.8;

  const markSvg = showMark
    ? `<g>
        ${geom.silhouette(cfg.accent)}
        <text
          x="${geom.labelCx}"
          y="${geom.labelCy}"
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
