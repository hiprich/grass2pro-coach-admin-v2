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

export type PartnerFontStyle =
  | "general-sans"
  | "satoshi"
  | "inter"
  | "mono"
  | "signature"
  | "calligraphy";

const PARTNER_FONT_STYLE_IDS = new Set<string>([
  "general-sans",
  "satoshi",
  "inter",
  "mono",
  "signature",
  "calligraphy",
]);

export function isPartnerFontStyle(v: string | undefined | null): v is PartnerFontStyle {
  return typeof v === "string" && PARTNER_FONT_STYLE_IDS.has(v);
}

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
  // Optional gradient fill for the mark. When set, takes precedence over
  // `accent` for the silhouette \u2014 the tagline still uses `accent` so the
  // wordmark+tagline pair remains coherent. Used by the studio's Pride
  // preset (6-stripe rainbow) and any future custom-gradient builder.
  // Stops are rendered as evenly-spaced bands when `kind` is "stripes",
  // or smooth blends when "blend". Direction defaults to vertical for
  // stripes (reads as a flag) and 45-deg for blends (reads as a sheen).
  accentGradient?: AccentGradient;
  // Hex colour for the mark's monogram glyph + the wordmark on dark
  // surfaces. Defaults to the deep G2P green for crispness on the lime.
  ink?: string;
  // Hex colour for the wordmark when rendered on a dark surface (the only
  // surface we currently render on \u2014 the coach landing header). Light/dark
  // variants can be added once we surface this on light backgrounds too.
  wordmarkColor?: string;
  // Optional override for the tagline colour. When unset the tagline
  // inherits `accent` (so it pairs with the mark by default). The studio
  // exposes this so coaches can run e.g. white wordmark + lime tagline
  // pairings on dark backgrounds.
  taglineColor?: string;
  // Optional outline (stroke) painted around the silhouette. Lets coaches
  // build crest-style logos: yellow fill + black border, or a Pride mark
  // ringed in white for kit visibility. Width is in viewBox units — the
  // mark is ~38 units across, so 1–3 reads as a thin→thick crest border.
  // When `outlineWidth` is omitted or 0 the silhouette renders fill-only,
  // matching every existing partner config unchanged.
  outlineColor?: string;
  outlineWidth?: number;
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
  // Font stack for monogram + wordmark + tagline in the generated SVG. Uses
  // the same web fonts as the Grass2Pro coach app where possible (loaded via
  // index.html Fontshare links). Omitted or unknown values fall back to the
  // neutral Inter/system stack so older saved configs keep a stable look.
  fontStyle?: PartnerFontStyle;
};

/** Presets for Logo Studio — match Grass2Pro app fonts (Fontshare) + Inter / mono fallbacks. */
export const PARTNER_FONT_OPTIONS: ReadonlyArray<{
  id: PartnerFontStyle;
  label: string;
  hint: string;
}> = [
  {
    id: "general-sans",
    label: "General Sans",
    hint: "Grass2Pro display — same as marketing headlines",
  },
  {
    id: "satoshi",
    label: "Satoshi",
    hint: "Grass2Pro body — same as the coach app UI",
  },
  {
    id: "inter",
    label: "Inter",
    hint: "Neutral geometric sans (compact)",
  },
  {
    id: "mono",
    label: "Mono",
    hint: "Technical / roster-board style",
  },
  {
    id: "signature",
    label: "Signature",
    hint: "Handwritten script (Dancing Script)",
  },
  {
    id: "calligraphy",
    label: "Calligraphy",
    hint: "Ornate script (Great Vibes)",
  },
];

/** CSS font-family string for SVG <text> (document fonts apply when the SVG is in-page). */
export function resolvePartnerFontStack(style: PartnerFontStyle | undefined): string {
  switch (style) {
    case "general-sans":
      return "'General Sans', 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    case "satoshi":
      return "'Satoshi', 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    case "mono":
      return "ui-monospace, 'SFMono-Regular', 'SF Mono', Menlo, Monaco, Consolas, 'Liberation Mono', monospace";
    case "signature":
      return "'Dancing Script', 'Brush Script MT', 'Segoe Script', cursive";
    case "calligraphy":
      return "'Great Vibes', 'Snell Roundhand', 'Segoe Script', cursive";
    case "inter":
    default:
      return "'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  }
}

export type PartnerLogoShape =
  | "squircle"
  | "circle"
  | "rectangle"
  | "oval"
  | "triangle"
  | "hexagon";

// Multi-colour fill for the mark. Two flavours:
//   - "stripes" \u2014 each colour gets an equal hard-edged band. Used for
//     the Pride preset (6-colour rainbow flag).
//   - "blend"   \u2014 colours blend smoothly into each other. Useful for
//     bi/trans/non-binary flag styles where the bands are blurred,
//     and for any "sunset" / "ocean" custom builds in v2.
// `direction` is the gradient axis: "vertical" stacks bands top-to-bottom
// (matches a flag), "horizontal" left-to-right, "diagonal" 45 degrees.
export type AccentGradient = {
  kind: "stripes" | "blend";
  colors: string[];
  direction?: "vertical" | "horizontal" | "diagonal";
  // Optional id used to namespace the SVG <linearGradient> id. Defaults to
  // a stable hash of the colour list so two logos with the same gradient
  // share a single defs entry when rendered side-by-side.
  id?: string;
};

const DEFAULTS: Required<
  Omit<
    PartnerLogoConfig,
    | "monogram"
    | "tagline"
    | "accentGradient"
    | "taglineColor"
    | "outlineColor"
    | "outlineWidth"
    | "fontStyle"
  >
> = {
  brandName: "",
  accent: "#c9e970",
  ink: "#1a2110",
  wordmarkColor: "#f3f5ee",
  style: "wordmark-with-mark",
  shape: "squircle",
};

// Stable namespace for gradient ids \u2014 stops collisions when multiple
// PartnerLogos render on the same page (the partner lockup AND the studio
// preview). Hash is djb2 over the joined colour list so identical
// gradients dedupe naturally.
function gradientHash(colors: string[]): string {
  const joined = colors.join(",");
  let h = 5381;
  for (let i = 0; i < joined.length; i++) {
    h = ((h << 5) + h + joined.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(h).toString(36);
}

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
  // SVG element string for the silhouette. fill + optional stroke attrs are
  // interpolated by the caller so each shape stays geometry-only.
  silhouette: (fill: string, strokeAttrs: string) => string;
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
        silhouette: (fill, stroke) =>
          `<rect x="0" y="${yOffset}" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${fill}"${stroke} />`,
        labelCx: size / 2,
        labelCy: yOffset + size / 2,
      };
    }
    case "circle": {
      const r = size / 2;
      return {
        width: size,
        height: size,
        silhouette: (fill, stroke) =>
          `<circle cx="${r}" cy="${yOffset + r}" r="${r}" fill="${fill}"${stroke} />`,
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
        silhouette: (fill, stroke) =>
          `<rect x="0" y="${yOffset}" width="${w}" height="${size}" rx="${radius}" ry="${radius}" fill="${fill}"${stroke} />`,
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
        silhouette: (fill, stroke) =>
          `<ellipse cx="${rx}" cy="${yOffset + ry}" rx="${rx}" ry="${ry}" fill="${fill}"${stroke} />`,
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
        silhouette: (fill, stroke) =>
          `<polygon points="${apex} ${right} ${left}" fill="${fill}"${stroke} />`,
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
        silhouette: (fill, stroke) =>
          `<polygon points="${points.join(" ")}" fill="${fill}"${stroke} />`,
        labelCx: cx,
        labelCy: cy,
      };
    }
  }
}

// Build a <linearGradient> defs block + the fill reference for it. Returns
// the empty string + the literal accent colour when no gradient is set, so
// the silhouette renderer can blindly use the returned fill string.
function buildGradientFill(
  gradient: AccentGradient | undefined,
  fallbackAccent: string,
): { defs: string; fill: string } {
  if (!gradient || gradient.colors.length === 0) {
    return { defs: "", fill: fallbackAccent };
  }
  const id = gradient.id ?? `pmg-${gradientHash(gradient.colors)}`;
  // Direction \u2192 SVG axis. SVG default is left-to-right; we override to
  // top-to-bottom for stripes (reads as a flag) and 45-deg for diagonals.
  const direction =
    gradient.direction ?? (gradient.kind === "stripes" ? "vertical" : "diagonal");
  const axis =
    direction === "vertical"
      ? { x1: "0%", y1: "0%", x2: "0%", y2: "100%" }
      : direction === "horizontal"
        ? { x1: "0%", y1: "0%", x2: "100%", y2: "0%" }
        : { x1: "0%", y1: "0%", x2: "100%", y2: "100%" };

  const n = gradient.colors.length;
  // Stripes: emit each colour as TWO stops at the band boundaries so
  // adjacent colours don't blur into each other (hard-edge bands).
  // Blend: emit each colour at its proportional position with smooth
  // interpolation between stops.
  const stops: string[] = [];
  if (gradient.kind === "stripes") {
    for (let i = 0; i < n; i++) {
      const start = (i / n) * 100;
      const end = ((i + 1) / n) * 100;
      stops.push(`<stop offset="${start}%" stop-color="${gradient.colors[i]}" />`);
      stops.push(`<stop offset="${end}%" stop-color="${gradient.colors[i]}" />`);
    }
  } else {
    for (let i = 0; i < n; i++) {
      const offset = n === 1 ? 50 : (i / (n - 1)) * 100;
      stops.push(`<stop offset="${offset}%" stop-color="${gradient.colors[i]}" />`);
    }
  }

  const defs = `<defs><linearGradient id="${id}" x1="${axis.x1}" y1="${axis.y1}" x2="${axis.x2}" y2="${axis.y2}">${stops.join("")}</linearGradient></defs>`;
  return { defs, fill: `url(#${id})` };
}

// Build the SVG string. Pure function, no DOM access, safe to call during
// SSR or to use inside dangerouslySetInnerHTML.
export function buildPartnerLogo(config: PartnerLogoConfig): string {
  const cfg = { ...DEFAULTS, ...config };
  const monogram = config.monogram ?? deriveMonogram(cfg.brandName);
  const showMark = cfg.style !== "wordmark-only";
  const showWordmark = cfg.style !== "mark-only";

  // Resolve the mark fill: gradient takes precedence over solid accent
  // when present. The tagline always uses the solid accent so the
  // wordmark column reads as a coherent unit even when the mark is a
  // multi-stripe Pride flag.
  const { defs: gradientDefs, fill: markFill } = buildGradientFill(
    config.accentGradient,
    cfg.accent,
  );

  // Layout constants. The viewBox height stays fixed at 50 so the lockup
  // height is consistent across shapes; the viewBox width grows when the
  // mark is a wide shape (rectangle, oval) so the wordmark doesn't collide
  // with it. Coaches don't need to think about pixels \u2014 CSS sets the
  // rendered size via height.
  const VB_H = 50;
  const MARK_SIZE = 38;
  const MARK_Y = 6;
  const resolvedFontStyle: PartnerFontStyle | undefined = isPartnerFontStyle(String(config.fontStyle ?? "").trim())
    ? (config.fontStyle as PartnerFontStyle)
    : undefined;
  const fontStack = resolvePartnerFontStack(resolvedFontStyle);
  const scriptFont = resolvedFontStyle === "signature" || resolvedFontStyle === "calligraphy";

  // Outline (stroke) attributes — emitted only when an outline is
  // configured. We use stroke-alignment via inset by half the stroke
  // width? SVG doesn't actually support inside-stroke painting, so we
  // accept that strokes paint half-outside / half-inside the geometry.
  // For our viewBox sizes (≈38u shapes) that's invisibly small and
  // matches how every UK club crest renders its border in the wild.
  const outlineWidth = config.outlineWidth ?? 0;
  const outlineColor = config.outlineColor ?? "#000000";
  const strokeAttrs =
    outlineWidth > 0
      ? ` stroke="${outlineColor}" stroke-width="${outlineWidth}" stroke-linejoin="round"`
      : "";

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
  const monogramLetterSpacing = scriptFont ? 0.12 : monogram.length >= 3 ? 0.5 : 0.8;
  const monogramWeight = scriptFont ? "700" : "900";

  const markSvg = showMark
    ? `<g>
        ${geom.silhouette(markFill, strokeAttrs)}
        <text
          x="${geom.labelCx}"
          y="${geom.labelCy}"
          dominant-baseline="middle"
          text-anchor="middle"
          font-family="${fontStack}"
          font-weight="${monogramWeight}"
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
  const wordmarkWeight = scriptFont ? "600" : "800";
  const wordmarkSize = scriptFont ? "13" : "14";
  const wordmarkTracking = scriptFont ? "0.45" : "1.5";
  const wordmarkText = scriptFont ? cfg.brandName.trim() : cfg.brandName.toUpperCase();
  const wordmark = showWordmark
    ? `<text
        x="${WORDMARK_X}" y="${wordmarkTextY}"
        font-family="${fontStack}"
        font-weight="${wordmarkWeight}"
        font-size="${wordmarkSize}"
        letter-spacing="${wordmarkTracking}"
        fill="${cfg.wordmarkColor}"
      >${escapeXml(wordmarkText)}</text>`
    : "";
  // Tagline colour: explicit override wins, else inherit accent so the
  // mark + tagline read as a colour-paired unit by default.
  const taglineFill = config.taglineColor ?? cfg.accent;
  const taglineWeight = scriptFont ? "500" : "600";
  const taglineSize = scriptFont ? "8.5" : "9";
  const taglineTracking = scriptFont ? "0.55" : "2.4";
  const taglineText =
    scriptFont && config.tagline ? config.tagline.trim() : (config.tagline || "").toUpperCase();
  const tagline = config.tagline && showWordmark
    ? `<text
        x="${WORDMARK_X}" y="40"
        font-family="${fontStack}"
        font-weight="${taglineWeight}"
        font-size="${taglineSize}"
        letter-spacing="${taglineTracking}"
        fill="${taglineFill}"
        opacity="0.85"
      >${escapeXml(taglineText)}</text>`
    : "";

  // The viewBox is fixed but the rendered width can flex via CSS. Setting
  // preserveAspectRatio="xMinYMid meet" anchors the lockup to the left edge
  // so it sits correctly when CSS rounds the SVG to a wider available box.
  return `<svg
    xmlns="http://www.w3.org/2000/svg"
    width="${VB_W}"
    height="${VB_H}"
    viewBox="0 0 ${VB_W} ${VB_H}"
    preserveAspectRatio="xMinYMid meet"
    overflow="visible"
    text-rendering="geometricPrecision"
    shape-rendering="geometricPrecision"
    role="img"
    aria-label="${escapeXml(cfg.brandName)}${config.tagline ? ` \u2014 ${escapeXml(config.tagline)}` : ""}"
  >
    ${gradientDefs}
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
