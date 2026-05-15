import { useEffect, useMemo, useState } from "react";
import { getCoachProfile, resolvePublishedCoachSlug } from "./coachProfiles";

export type PublicCoachDirectoryEntry = {
  id: string;
  name: string;
  role: string;
  credential: string;
  location: string;
  avatarUrl: string;
  publicSlugHint: string;
  partner: { brandName: string; monogram?: string; tagline?: string } | null;
};

function cardAvatarSrc(entry: PublicCoachDirectoryEntry, publishedSlug: string | null): string {
  if (entry.avatarUrl) return entry.avatarUrl;
  if (publishedSlug) {
    const profile = getCoachProfile(publishedSlug);
    if (profile?.avatarSrc) return profile.avatarSrc;
  }
  return "";
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Searchable text: API row plus static /c/:slug profile when linked (venue/bio often live only in coachProfiles). */
function directoryEntrySearchHaystack(entry: PublicCoachDirectoryEntry): string {
  const partner = entry.partner?.brandName || "";
  const chunks: string[] = [entry.name, entry.role, entry.location, entry.credential, partner];
  const slug = resolvePublishedCoachSlug(entry);
  if (slug) {
    const p = getCoachProfile(slug);
    if (p) {
      chunks.push(
        p.name,
        p.tagline,
        p.location,
        p.bio,
        p.pricingNote,
        p.ageGroups,
        p.kicker ?? "",
        ...(p.specialisms ?? []),
        ...(p.credentials ?? []),
      );
      if (p.partner?.brandName) chunks.push(p.partner.brandName);
      if (p.partner?.tagline) chunks.push(p.partner.tagline);
    }
  }
  return chunks.filter(Boolean).join(" ").toLowerCase();
}

export default function CoachDirectoryPage() {
  const [coaches, setCoaches] = useState<PublicCoachDirectoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    document.title = "Find a coach — Grass2Pro";
    const prev = document.documentElement.dataset.surface;
    document.documentElement.dataset.surface = "homepage";
    return () => {
      if (prev === undefined) delete document.documentElement.dataset.surface;
      else document.documentElement.dataset.surface = prev;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/public-coaches")
      .then(async (r) => {
        const data: { ok?: boolean; coaches?: PublicCoachDirectoryEntry[]; message?: string } = await r
          .json()
          .catch(() => ({}));
        if (!r.ok) throw new Error(data?.message || "Could not load coaches");
        if (!data?.ok || !Array.isArray(data.coaches)) throw new Error("Unexpected response");
        if (!cancelled) setCoaches(data.coaches);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Something went wrong");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!coaches) return [];
    const q = query.trim().toLowerCase();
    if (!q) return coaches;
    return coaches.filter((c) => directoryEntrySearchHaystack(c).includes(q));
  }, [coaches, query]);

  return (
    <div className="homepage coach-directory" data-testid="coach-directory">
      <header className="homepage-topbar coach-directory__topbar">
        <a href="/" className="homepage-brand homepage-brand-linked">
          <span className="homepage-brand-mark">G2P</span>
          <span className="homepage-brand-text">Grass2Pro</span>
        </a>
        <nav className="coach-directory__nav" aria-label="Directory">
          <a href="/portal" className="coach-directory__nav-link">
            Parent portal
          </a>
          <a href="/coach" className="coach-directory__nav-link">
            Coach sign in
          </a>
        </nav>
      </header>

      <main className="coach-directory__main">
        <div className="coach-directory__intro">
          <p className="coach-directory__kicker">For parents</p>
          <h1 className="coach-directory__title">Find a coach</h1>
          <p className="coach-directory__lede">
            Search Grass2Pro coaches by name, area, or club. When a coach has a public page, you can open
            their full profile and contact options from here.
          </p>
        </div>

        <div className="coach-directory__search-wrap">
          <label className="coach-directory__search-label" htmlFor="coach-directory-search">
            Search
          </label>
          <input
            id="coach-directory-search"
            type="search"
            className="coach-directory__search-input"
            placeholder="Name, location, role, or club…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {error ? (
          <p className="coach-directory__message coach-directory__message--error" role="alert">
            {error}
          </p>
        ) : null}

        {!error && coaches === null ? (
          <p className="coach-directory__message">Loading coaches…</p>
        ) : null}

        {!error && coaches && coaches.length === 0 ? (
          <p className="coach-directory__message">No coaches are listed yet. Check back soon.</p>
        ) : null}

        {!error && filtered.length > 0 ? (
          <ul className="coach-directory__grid">
            {filtered.map((entry) => {
              const publishedSlug = resolvePublishedCoachSlug(entry);
              const avatarSrc = cardAvatarSrc(entry, publishedSlug);
              return (
                <li key={entry.id} className="coach-directory__card">
                  <div className="coach-directory__card-top">
                    <div className="coach-directory__avatar" aria-hidden="true">
                      {avatarSrc ? (
                        <img src={avatarSrc} alt="" loading="lazy" decoding="async" />
                      ) : (
                        <span className="coach-directory__avatar-fallback">{initials(entry.name)}</span>
                      )}
                    </div>
                    <div className="coach-directory__card-text">
                      <h3 className="coach-directory__card-name">{entry.name}</h3>
                      <p className="coach-directory__card-role">{entry.role}</p>
                      {entry.location ? <p className="coach-directory__card-location">{entry.location}</p> : null}
                      {entry.partner ? (
                        <p className="coach-directory__card-partner">{entry.partner.brandName}</p>
                      ) : null}
                      {entry.credential ? <p className="coach-directory__card-credential">{entry.credential}</p> : null}
                    </div>
                  </div>
                  <div className="coach-directory__card-actions">
                    {publishedSlug ? (
                      <a href={`/c/${publishedSlug}`} className="homepage-cta homepage-cta-primary">
                        View profile
                      </a>
                    ) : (
                      <span className="coach-directory__no-page">Public profile page not linked yet</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}

        {!error && coaches && coaches.length > 0 && filtered.length === 0 ? (
          <p className="coach-directory__message">No coaches match “{query.trim()}”. Try a shorter search.</p>
        ) : null}
      </main>

      <footer className="homepage-footer">
        <div className="homepage-footer-inner">
          <span className="homepage-footer-brand">Grass2Pro</span>
          <span className="homepage-footer-tag">UK grassroots football</span>
        </div>
      </footer>
    </div>
  );
}
