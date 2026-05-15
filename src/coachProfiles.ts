// Public-facing coach profiles, keyed by URL slug.
//
// Surfaced at /c/:slug as a parent-shareable coach landing page (the kind a
// coach drops into a WhatsApp group to recruit new players). The page reads
// from this module rather than Airtable so a freshly-onboarded coach can
// ship to a public URL the same day Hope or one of the other launch coaches
// hands over their bio. Phase E onwards swaps this for an Airtable-backed
// admin so non-technical coaches can self-serve.
//
// New coach? Add an entry below, drop their photo into public/coaches/, and
// the route renders automatically. Bio strings honour newlines as paragraph
// breaks when rendered.

export type CoachProfile = {
  slug: string;                  // URL slug, e.g. "hope" → /c/hope
  name: string;                  // Public display name
  // Static tagline. Used as a literal fallback when `taglinePrefix` /
  // `experienceSinceISO` aren't provided. Prefer the dynamic pair below for
  // anything time-sensitive so the page ages gracefully without manual edits.
  tagline: string;
  // Optional dynamic-tagline pair. If both are set, the rendered tagline is
  // computed at view time as `"${taglinePrefix} · ${N} year(s) experience"`,
  // where N rolls over on the anniversary of `experienceSinceISO`. Example:
  // taglinePrefix = "FA Talent ID Level 2 Scout", experienceSinceISO =
  // "2023-05-01" → renders "3 years experience" today (May 2026), "4" on
  // 1 May 2027, and so on. Singular guard keeps "1 year experience" clean.
  taglinePrefix?: string;
  experienceSinceISO?: string;   // ISO 8601 date string YYYY-MM-DD
  bio: string;                   // 1-3 sentence intro paragraph
  specialisms: string[];         // Bullet list of "what I do"
  ageGroups: string;             // Display string e.g. "U7-U12"
  location: string;              // Single line venue address
  pricingNote: string;           // "Contact for pricing", or e.g. "From £15/session"
  avatarSrc: string;             // 1:1 profile shot, served from /public
  heroSrc?: string;              // Optional taller hero shot for the top of the page
  // Optional permanently-muted, autoplay, looping background video for
  // the hero. When set, replaces the static heroSrc image with a <video>
  // element. The hero image still renders as the poster (instant paint
  // before the video loads) and as a graceful fallback if the file
  // 404s or the browser blocks autoplay. Path served from /public, e.g.
  // "/coaches/hope-hero.mp4". Must have NO audio track — the video is
  // muted forever (no unmute control) so previewers (WhatsApp, iMessage)
  // never blast sound.
  heroVideoSrc?: string;
  // Optional YouTube video ID for the hero background. Preferred over
  // heroVideoSrc when we don't want to host the file ourselves (zero
  // Netlify bandwidth, YouTube CDN handles delivery globally). Just the
  // 11-character ID, NOT the full URL — e.g. "dQw4w9WgXcQ", not
  // "https://youtube.com/watch?v=dQw4w9WgXcQ". The video MUST be public
  // or unlisted (private videos can't embed). Renders as an autoplay,
  // muted, looping iframe with a transparent overlay layer that blocks
  // clicks (so the YouTube chrome and "Watch on YouTube" CTA can't be
  // triggered — pure ambient background, no interaction). The hero image
  // still renders as a CSS background behind the iframe for instant
  // first paint and to mask the YouTube thumbnail flash.
  // If both heroVideoSrc and heroYouTubeId are set, heroYouTubeId wins.
  heroYouTubeId?: string;
  whatsappE164?: string;         // E.164-formatted phone, no spaces, no +. Used for wa.me deep-link
  airtableRecordId?: string;     // Coaches table rec id — links registrations back to coach
  // Small, all-caps eyebrow line above the coach name. Use the coach's
  // primary role (NOT a department title — "FA Talent ID L2 Scout" is
  // closer than "Head of Recruitment"). Defaults to "Coach" if missing.
  // Example: "FA TALENT ID L2 SCOUT · PUREPRO ELITE CO-FOUNDER".
  kicker?: string;
  // Free-form extra credibility line(s) shown under the bio (e.g. "Tottenham
  // Hotspur scout"). Kept separate from `bio` so it can be styled as small
  // pill-shaped credentials.
  credentials?: string[];
  // Optional partner / club affiliation surfaced as a top-right lockup on
  // the coach landing header. Lets coaches show their club/network alongside
  // Grass2Pro so the page reads as a partnership, not solo branding.
  // All fields optional so coaches without a partner show G2P alone.
  partner?: {
    // Brand name. Drives the wordmark + the auto-derived monogram.
    brandName: string;
    // Optional 2-3 letter override if the auto-derived monogram is wrong.
    monogram?: string;
    // Optional supporting line under the wordmark, e.g. "Talent Pathway".
    tagline?: string;
    // Optional click-through. When set, the lockup becomes an <a> opening
    // in a new tab. Omit to render as a visual mark only.
    href?: string;
  };
};

export const COACH_PROFILES: Record<string, CoachProfile> = {
  hope: {
    slug: "hope",
    name: "Hope Bouhe",
    tagline: "FA Talent ID Level 2 Scout · 3 years experience",
    taglinePrefix: "FA Talent ID Level 2 Scout",
    experienceSinceISO: "2023-05-01",
    // Eyebrow above the name. Hope is a scout/co-founder, not a head of
    // recruitment — keeping this aligned to his real credentials avoids
    // misrepresentation that would matter at acquisition diligence.
    kicker: "FA TALENT ID L2 SCOUT · PUREPRO ELITE CO-FOUNDER",
    bio: "I'm Hope — Tottenham Hotspur scout and co-founder of PurePro Elite. We run elite small-group sessions that develop in-game effectiveness and prepare players for academy football.",
    credentials: [
      "Tottenham Hotspur Scout",
      "Academy pathway specialist",
    ],
    specialisms: [
      "Elite small-group sessions",
      "Developing in-game effectiveness",
      "Academy-standard strengths & gaps assessment",
      "Academy-style feedback reports",
      "Friendly fixtures vs academies",
      "High-level tournaments",
    ],
    ageGroups: "U7–U12",
    location: "Colindale Football Centre, Great Strand, NW9 5PE",
    pricingNote: "Contact Hope for pricing",
    avatarSrc: "/coaches/hope-avatar.jpg",
    heroSrc: "/coaches/hope-hero.jpg",
    // Background hero video served from YouTube. Set this to Hope's
    // 11-character YouTube video ID (the part after "v=" in the URL,
    // e.g. "dQw4w9WgXcQ"). Video must be public or unlisted to embed.
    // The iframe is muted, autoplay, looped, and overlaid with a
    // transparent div so YouTube branding and clicks can't be triggered.
    // Until uncommented, the page renders the static heroSrc image.
    // TODO: paste real YouTube ID once Hope's clip is uploaded.
    // heroYouTubeId: "REPLACE_WITH_11_CHAR_YT_ID",
    whatsappE164: "447918950309",
    airtableRecordId: "rect8JRrno85KaRNG",
    partner: {
      brandName: "PurePro Elite",
      monogram: "PE",
      tagline: "Talent Pathway",
      // No href yet — PurePro Elite doesn't have a public site. Add this
      // field when they do and the lockup will auto-become a clickable
      // anchor opening in a new tab.
    },
  },
};

export function getCoachProfile(slug: string): CoachProfile | null {
  const key = slug.toLowerCase().trim();
  return COACH_PROFILES[key] ?? null;
}

/** Map a row from GET /api/public-coaches to a static `/c/:slug` when possible. */
export function resolvePublishedCoachSlug(entry: {
  id: string;
  publicSlugHint?: string;
}): string | null {
  const hint = (entry.publicSlugHint || "").trim().toLowerCase();
  if (hint && getCoachProfile(hint)) return hint;
  for (const slug of listCoachSlugs()) {
    const p = getCoachProfile(slug);
    if (p?.airtableRecordId && p.airtableRecordId === entry.id) return slug;
  }
  return null;
}

// Compute whole years between an ISO start date and now, rolling over on the
// anniversary (not on the calendar year boundary). Pure function, defensive:
// returns 0 for invalid input or future dates so the UI never shows "-1 years".
export function computeYearsOfExperience(
  sinceISO: string,
  now: Date = new Date(),
): number {
  const start = new Date(sinceISO);
  if (Number.isNaN(start.getTime()) || start.getTime() > now.getTime()) return 0;
  let years = now.getFullYear() - start.getFullYear();
  const beforeAnniversary =
    now.getMonth() < start.getMonth() ||
    (now.getMonth() === start.getMonth() && now.getDate() < start.getDate());
  if (beforeAnniversary) years -= 1;
  return Math.max(0, years);
}

// Build the rendered tagline. Uses the dynamic prefix + computed years when
// both are set, otherwise falls back to the static tagline string.
export function renderTagline(coach: CoachProfile, now: Date = new Date()): string {
  if (coach.taglinePrefix && coach.experienceSinceISO) {
    const years = computeYearsOfExperience(coach.experienceSinceISO, now);
    const noun = years === 1 ? "year" : "years";
    return `${coach.taglinePrefix} · ${years} ${noun} experience`;
  }
  return coach.tagline;
}

// All currently-registered slugs, used by /c/:slug router fallback to render
// a "coach not found" state without an extra round-trip.
export function listCoachSlugs(): string[] {
  return Object.keys(COACH_PROFILES);
}
