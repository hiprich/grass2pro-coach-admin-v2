// Lightweight coach onboarding landing at `/coach-registration`. Visiting sets a
// browser flag so Logo Studio (`/admin/logo-studio`) does not redirect signed-out
// visitors to `/coach`. Full dashboard access remains magic-link gated at `/coach`.

import { useEffect } from "react";
import { grantCoachRegistrationLogoAccess } from "./lib/coachRegistrationLogoGate";

export default function CoachRegistrationPage() {
  useEffect(() => {
    grantCoachRegistrationLogoAccess();
    document.title = "Coach registration — Grass2Pro";

    const previous = document.documentElement.dataset.surface;
    document.documentElement.dataset.surface = "homepage";

    return () => {
      if (previous === undefined) delete document.documentElement.dataset.surface;
      else document.documentElement.dataset.surface = previous;
    };
  }, []);

  return (
    <div className="coach-registration-page homepage" data-testid="coach-registration-page">
      <header className="homepage-topbar">
        <a href="/" className="homepage-brand homepage-brand-linked" aria-label="Grass2Pro homepage">
          <span className="homepage-brand-mark">G2P</span>
          <span className="homepage-brand-text">Grass2Pro</span>
        </a>
      </header>

      <main className="coach-registration-main">
        <span className="homepage-coach-register-chip">Coach onboarding</span>
        <h1 className="coach-registration-title">You're in — build your Grass2Pro brand</h1>
        <p className="coach-registration-lead">
          Open Logo Studio to design the partner lockup for your Grass2Pro page. SVG, PNG,
          and exportable JSON stay on your device until you save — your full coach dashboard still
          uses email sign-in.
        </p>
        <ul className="coach-registration-list">
          <li>Create your watermark in minutes</li>
          <li>Use the export on WhatsApp and your site</li>
          <li>When you're live on Grass2Pro, sign in via the magic link emailed to your coach address</li>
        </ul>
        <div className="homepage-cta-row coach-registration-actions">
          <a
            href="/admin/logo-studio"
            className="homepage-cta homepage-cta-primary"
            data-testid="coach-registration-open-studio"
          >
            Open Logo Studio
          </a>
        </div>
        <p className="coach-registration-footnote">
          Already onboarded?{" "}
          <a href="/coach" className="homepage-coach-signin-link">
            Coach sign-in
          </a>{" "}
          · Back to{" "}
          <a href="/" className="homepage-coach-signin-link">
            homepage
          </a>
        </p>
      </main>
    </div>
  );
}
