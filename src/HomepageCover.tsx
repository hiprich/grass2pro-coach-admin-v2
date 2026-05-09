// Public homepage cover — rendered at /home.
//
// This is the "book cover" parents and visitors see when they land on
// grass2pro from outside. Two audiences (parents + coaches) split-screen,
// real youth football photo with a lime overlay, and one primary CTA per
// audience. Search and exploration deliberately sit lower so the cover
// reads as a brand statement first, not a directory.
//
// Brand: lime-on-black, mirroring the Hope landing page so the system
// feels consistent. Crest, kits and stripe in the photo reinforce the
// visual identity without us shouting it in copy.
//
// Routing: this surface is mounted by AppRoot when window.location.pathname
// matches /home (case-insensitive). The current admin dashboard stays at
// "/" so existing bookmarks keep working.

import { useEffect, useState, useCallback } from "react";

// Marketing benefit cards. Each one is a single-sentence promise, written
// for a parent skim-reading on a phone. Order matters: scan-in/out is the
// most concrete, progress is the emotional hook, video is the proof.
const PARENT_BENEFITS: Array<{ title: string; body: string }> = [
  {
    title: "Scan-in, scan-out",
    body: "QR check-ins at the gate. You always know when your child arrived and who picked them up.",
  },
  {
    title: "Per-player progress",
    body: "A 0–100 score across attendance, punctuality and effort. Every session adds to your child's story.",
  },
  {
    title: "Match clips, parent-ready",
    body: "Coach-uploaded video moments, trimmed for WhatsApp. Share the goal, not a 90-minute file.",
  },
];

// Coach benefits sit alongside the parent ones so the same cover serves
// the recruitment side. Coaches scrolling the page see the platform tools
// they would actually adopt.
const COACH_BENEFITS: Array<{ title: string; body: string }> = [
  {
    title: "One link, every parent",
    body: "Your own /c/yourname page. Drop it in WhatsApp, parents register in 30 seconds.",
  },
  {
    title: "Attendance auto-tracked",
    body: "Scan-ins build the register for you. No manual ticking, no missed names.",
  },
  {
    title: "Shareable progress cards",
    body: "Weekly highlight image per player. Parents share, you grow — without lifting a finger.",
  },
];

export default function HomepageCover() {
  // Use the same data-surface pattern as the coach landing page so global
  // overrides in index.css can flip the surface to dark/brand without
  // bleeding into the admin dashboard.
  // Book-cover state: visitors land on a single full-bleed photo (the
  // "closed cover"). Tapping anywhere flips the cover open like the
  // front of a book, revealing the headline, CTAs, and the For-parents
  // / For-coaches sections behind it. Tapping the (now-open) cover
  // again flips it closed. While closed we lock body scroll so the
  // visitor can't scroll past without engaging — the flip IS the entry.
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const previous = document.documentElement.dataset.surface;
    document.documentElement.dataset.surface = "homepage";
    document.title = "Grass2Pro — UK grassroots football, organised.";
    return () => {
      if (previous === undefined) delete document.documentElement.dataset.surface;
      else document.documentElement.dataset.surface = previous;
    };
  }, []);

  // Lock scroll while the cover is closed; restore on open. Also handle
  // unmount cleanup so we never leave the body scroll-locked.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = isOpen ? "" : "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const toggleCover = useCallback(() => {
    setIsOpen((v) => !v);
  }, []);

  // Keyboard a11y: Enter/Space on the cover toggles it.
  const onCoverKey = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleCover();
      }
    },
    [toggleCover],
  );

  return (
    <div
      className={`homepage homepage-book ${isOpen ? "is-open" : "is-closed"}`}
      data-testid="homepage-cover"
    >
      {/* Book cover — fixed full-bleed overlay. Sits ABOVE the page when
          closed, flips out on rotateY to reveal the page underneath when
          open. The cover lives outside the page flow (position: fixed)
          so the page below renders normally and reads correctly once
          revealed. The 3D perspective lives on .homepage-book itself so
          the rotation pivots crisply around the cover's left edge. */}
      <button
        type="button"
        className="homepage-book-cover"
        aria-label={isOpen ? "Close cover" : "Open cover — tap to enter"}
        aria-pressed={isOpen}
        onClick={toggleCover}
        onKeyDown={onCoverKey}
        data-testid="book-cover"
      >
        <span className="homepage-book-cover-inner">
          {/* Page 1 photo: parents handing their kids over at the gate of
              the pitch. Sets up the narrative — 'parents drop off, coach
              takes over' — which resolves on page 2 inside. Mobile gets
              a 9:16 portrait crop centred on the lead handoff. */}
          <picture>
            <source
              media="(max-width: 640px)"
              srcSet="/g2p-page1-portrait.jpg"
            />
            <img
              src="/g2p-page1.jpg"
              alt="Parents arriving at the pitch with their kids in G2P kit at sunset"
              loading="eager"
              decoding="async"
            />
          </picture>
          {/* Subtle dark gradient at the bottom for the overlay copy. */}
          <span className="homepage-book-cover-overlay" aria-hidden="true" />
          {/* Brand mark on the cover so the closed state still reads as
              Grass2Pro at a glance. Sits top-left, lime on dark. */}
          <span className="homepage-book-cover-brand" aria-hidden="true">
            <span className="homepage-book-cover-brand-mark">G2P</span>
            <span className="homepage-book-cover-brand-text">Grass2Pro</span>
          </span>
          {/* Closed-state hint: pulsing 'Tap anywhere' overlay. Hidden
              once the cover is open so it doesn't compete with the page. */}
          <span className="homepage-book-cover-hint" aria-hidden="true">
            <span className="homepage-book-cover-hint-pulse">Tap anywhere</span>
            <span className="homepage-book-cover-hint-sub">to open</span>
          </span>
          {/* Open-state hint: tiny 'Close' chip in the top-right so the
              visitor knows the cover can be flipped back. */}
          <span className="homepage-book-cover-close" aria-hidden="true">
            ✕ Close
          </span>
        </span>
        {/* Spine — thin lime line at the rotation axis (left edge) that
            reads as a book spine when the cover is open. */}
        <span className="homepage-book-cover-spine" aria-hidden="true" />
      </button>

      {/* Top bar — minimal: just the brand mark. Hidden while the cover
          is closed (the cover has its own brand mark) and revealed once
          the cover flips open. */}
      <header className="homepage-topbar">
        <div className="homepage-brand">
          <span className="homepage-brand-mark">G2P</span>
          <span className="homepage-brand-text">Grass2Pro</span>
        </div>
      </header>

      {/* Hero — page 2 of the book. When the cover flips open the visitor
          lands here on a full-bleed photo of the coach instructing the
          team — the visual sequel to the parent-handoff cover. The whole
          hero is itself tappable: tapping anywhere flips the cover back
          closed (story reverses), so the visitor can play with the
          metaphor freely. */}
      <section
        className="homepage-hero homepage-hero-page2"
        onClick={(e) => {
          // Don't close if the visitor is clicking a CTA link — that
          // should navigate, not flip back. Close only on photo/empty
          // background taps.
          const target = e.target as HTMLElement;
          if (target.closest("a, button")) return;
          setIsOpen(false);
        }}
      >
        <div className="homepage-hero-photo" aria-hidden="true">
          {/* Page 2 photo: same pitch, same Shard skyline, same kit —
              continuity with the cover so the flip reads as turning
              ONE page in ONE story. Mobile uses a 9:16-friendly
              portrait crop, desktop keeps the cinematic landscape. */}
          <picture>
            <source
              media="(max-width: 640px)"
              srcSet="/g2p-page2-portrait.jpg"
            />
            <img
              src="/g2p-page2.jpg"
              alt="Coach instructing five young players in lime-and-black kit at golden hour"
              loading="eager"
              decoding="async"
            />
          </picture>
          <div className="homepage-hero-overlay" />
        </div>
        {/* Tiny chip in the top-right that hints page 2 is also tappable.
            Hidden on the inner CTAs/links so they still work normally. */}
        <span className="homepage-page2-back" aria-hidden="true">
          ← Tap to close
        </span>

        <div className="homepage-hero-text">
          <p className="homepage-kicker">UK grassroots football, organised.</p>
          <h1 className="homepage-headline">
            Every match.
            <br />
            Every minute.
            <br />
            <span className="homepage-headline-accent">Every player.</span>
          </h1>
          <p className="homepage-subhead">
            Scan-in attendance, per-player progress, and parent-ready video clips —
            built for grassroots coaches and the families who stand behind them.
          </p>

          <div className="homepage-cta-row">
            <a
              href="/portal"
              className="homepage-cta homepage-cta-primary"
              data-testid="cta-parent"
            >
              See my child's progress
            </a>
            <a
              href="#coaches"
              className="homepage-cta homepage-cta-secondary"
              data-testid="cta-coach"
            >
              Find a coach
            </a>
          </div>
        </div>
      </section>

      {/* Benefits — two parallel three-up grids: parents first because most
          inbound traffic is parents, coaches below to anchor the recruitment
          side of the marketplace. */}
      <section className="homepage-benefits" id="parents">
        <h2 className="homepage-section-title">For parents</h2>
        <ul className="homepage-benefit-grid">
          {PARENT_BENEFITS.map((b) => (
            <li key={b.title} className="homepage-benefit-card">
              <h3>{b.title}</h3>
              <p>{b.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="homepage-benefits homepage-benefits-alt" id="coaches">
        <h2 className="homepage-section-title">For coaches</h2>
        <ul className="homepage-benefit-grid">
          {COACH_BENEFITS.map((b) => (
            <li key={b.title} className="homepage-benefit-card">
              <h3>{b.title}</h3>
              <p>{b.body}</p>
            </li>
          ))}
        </ul>

        {/* Featured coach — Hope is the launch coach, so we surface his
            page directly here as a proof point. Future iterations will
            iterate this into a roster strip. */}
        <div className="homepage-featured-coach">
          <p className="homepage-featured-eyebrow">Featured coach</p>
          <a className="homepage-featured-card" href="/c/hope">
            <span className="homepage-featured-name">Hope Bouhe</span>
            <span className="homepage-featured-role">
              Head of Recruitment · PurePro Elite · FA Talent ID Level 2 Scout
            </span>
            <span className="homepage-featured-cta">Visit profile →</span>
          </a>
        </div>
      </section>

      {/* Footer — minimal, lime accent on the wordmark to match the topbar.
          Year is hard-coded to current copyright; we'll auto-bump on
          subsequent iterations once we have a build-time variable. */}
      <footer className="homepage-footer">
        <div className="homepage-footer-inner">
          <span className="homepage-footer-brand">Grass2Pro</span>
          <span className="homepage-footer-tag">
            Built in London for UK grassroots football.
          </span>
        </div>
      </footer>
    </div>
  );
}
