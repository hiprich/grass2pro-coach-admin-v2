// Netlify Edge Function: prerender per-coach <title> + OG/Twitter meta for
// /c/:slug. The SPA at /c/:slug also injects these tags client-side after
// hydration (see src/CoachLandingPage.tsx), but WhatsApp / iMessage / Slack /
// Twitter crawlers don't execute JS — so they unfurl with the static
// index.html title ("Grass2Pro Coach Admin") instead of the coach's name.
// This function intercepts the request, fetches index.html via context.next(),
// rewrites the <title> and the og:/twitter: meta tags in the raw HTML, and
// returns it. The body is untouched, so the SPA still hydrates normally.
//
// Edge Functions run on Deno, so this file MUST NOT import from src/*. The
// slug → profile data is hand-mirrored from src/coachProfiles.ts. There's
// only one launch coach today; when the roster grows past 2-3 coaches we
// should swap this for a tiny build step that emits a JSON file we read here.
//
// The title format and description text MUST match what CoachLandingPage.tsx
// renders client-side, so crawlers see the same string Google sees post-hydrate.

import type { Context } from "https://edge.netlify.com";

type CoachMeta = {
  name: string;
  // Pre-rendered role label (CoachLandingPage's roleLabelFor() output). We
  // bake it in rather than re-implementing the title-casing logic here.
  role: string;
  // Pre-rendered OG/Twitter description. Hope gets a hand-crafted line;
  // every future coach falls back to a boilerplate.
  description: string;
  // Path on the same origin, e.g. "/coaches/hope-hero.jpg". Absolute-ised
  // against request origin at runtime.
  ogImage: string;
};

const COACHES: Record<string, CoachMeta> = {
  hope: {
    name: "Hope Bouhe",
    role: "FA Talent ID L2 Scout",
    description:
      "FA Talent ID L2 Scout Hope Bouhe — Spurs scout, PurePro Elite co-founder. Grassroots players scouted, developed, showcased.",
    ogImage: "/coaches/hope-hero.jpg",
  },
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHeadInjection(
  coach: CoachMeta,
  url: string,
  ogImageAbsolute: string,
): string {
  const title = `${coach.name} — ${coach.role} · Grass2Pro`;
  const t = escapeHtml(title);
  const d = escapeHtml(coach.description);
  const u = escapeHtml(url);
  const img = escapeHtml(ogImageAbsolute);
  return [
    `<meta name="x-prerendered" content="c-slug">`,
    `<meta property="og:title" content="${t}">`,
    `<meta property="og:description" content="${d}">`,
    `<meta property="og:image" content="${img}">`,
    `<meta property="og:url" content="${u}">`,
    `<meta property="og:type" content="profile">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${t}">`,
    `<meta name="twitter:description" content="${d}">`,
    `<meta name="twitter:image" content="${img}">`,
  ].join("\n    ");
}

// Strip the static og:/twitter: tags shipped in index.html so our coach-
// specific ones don't sit alongside the generic site defaults. Conservative
// regex: only removes <meta> tags whose property/name attribute matches the
// keys we re-inject below.
function stripStaticSocialMeta(html: string): string {
  const keys = [
    "og:title",
    "og:description",
    "og:image",
    "og:url",
    "og:type",
    "twitter:card",
    "twitter:title",
    "twitter:description",
    "twitter:image",
  ];
  for (const key of keys) {
    const re = new RegExp(
      `\\s*<meta\\s+(?:property|name)=["']${key}["'][^>]*>`,
      "gi",
    );
    html = html.replace(re, "");
  }
  return html;
}

export default async function handler(
  request: Request,
  context: Context,
): Promise<Response> {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/c\/([^/?#]+)\/?$/);
  if (!match) return context.next();

  const slug = decodeURIComponent(match[1]).toLowerCase().trim();
  const coach = COACHES[slug];
  // Unknown slug → let the SPA render its "coach not found" state. The static
  // OG tags will be wrong, but that's no worse than today and the user
  // experience is unchanged.
  if (!coach) return context.next();

  const response = await context.next();
  const contentType = response.headers.get("content-type") ?? "";
  // Only rewrite HTML responses; assets and JSON pass through.
  if (!contentType.toLowerCase().includes("text/html")) return response;

  let html = await response.text();

  const canonicalUrl = `${url.origin}/c/${slug}`;
  const ogImageAbsolute = coach.ogImage.startsWith("http")
    ? coach.ogImage
    : `${url.origin}${coach.ogImage}`;
  const newTitle = `${coach.name} — ${coach.role} · Grass2Pro`;

  // Replace <title>...</title>. Static index.html ships one; if for some reason
  // it's missing we inject after <head>.
  if (/<title>[^<]*<\/title>/i.test(html)) {
    html = html.replace(
      /<title>[^<]*<\/title>/i,
      `<title>${escapeHtml(newTitle)}</title>`,
    );
  } else {
    html = html.replace(
      /<head(\s[^>]*)?>/i,
      (m) => `${m}\n    <title>${escapeHtml(newTitle)}</title>`,
    );
  }

  html = stripStaticSocialMeta(html);

  const injection = buildHeadInjection(coach, canonicalUrl, ogImageAbsolute);
  html = html.replace(
    /<\/head>/i,
    `    ${injection}\n  </head>`,
  );

  const headers = new Headers(response.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  // Short edge cache. Coach profiles change weekly at most, but we want
  // updates to roll out without a manual purge.
  headers.set("cache-control", "public, max-age=60, s-maxage=300");
  // Drop content-length — body length changed after rewrite.
  headers.delete("content-length");

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const config = {
  path: "/c/*",
};
