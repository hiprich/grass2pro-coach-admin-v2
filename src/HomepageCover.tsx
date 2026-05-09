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

import { useEffect } from "react";

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
  useEffect(() => {
    const previous = document.documentElement.dataset.surface;
    document.documentElement.dataset.surface = "homepage";
    document.title = "Grass2Pro — UK grassroots football, organised.";
    return () => {
      if (previous === undefined) delete document.documentElement.dataset.surface;
      else document.documentElement.dataset.surface = previous;
    };
  }, []);

  return (
    <div className="homepage" data-testid="homepage-cover">
      {/* Top bar — minimal: just the brand mark. We deliberately omit a
          nav menu on the cover so the eye lands on the headline + CTAs. */}
      <header className="homepage-topbar">
        <div className="homepage-brand">
          <span className="homepage-brand-mark">G2P</span>
          <span className="homepage-brand-text">Grass2Pro</span>
        </div>
      </header>

      {/* Hero — full-width photo with lime gradient overlay, headline,
          subhead, two CTAs (parent + coach). The photo carries the brand
          visually (lime-stripe kits, G2P crest baked in). */}
      <section className="homepage-hero">
        <div className="homepage-hero-photo" aria-hidden="true">
          <img
            src="/g2p-hero.jpg"
            alt=""
            loading="eager"
            decoding="async"
          />
          <div className="homepage-hero-overlay" />
        </div>

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
