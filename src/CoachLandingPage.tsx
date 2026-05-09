// Public coach landing page — rendered at /c/:slug (e.g. /c/hope).
//
// This is the single shareable URL a coach drops into a WhatsApp group to
// recruit new players. It is intentionally NOT part of the coach admin app:
// no auth, no sidebar, no chrome. Just the coach, what they do, where they
// do it, and a single primary CTA — "Register with [Coach]" — that opens a
// short form. The form posts to /api/coach-register, which writes to
// Airtable's "Coach Registrations" table and emails the coach via Resend.
//
// Brand language: lime-on-black, mirroring the "Register with Hope" CTA mock
// the user sent. The page deliberately reads as a different surface than
// the admin app — closer to a coach's personal site than a SaaS dashboard —
// to make it feel "of the coach", not "of Grass2Pro". Grass2Pro brand sits
// in the footer rather than the header.

import { useEffect, useMemo, useState } from "react";
import type { CoachProfile } from "./coachProfiles";
import { renderTagline } from "./coachProfiles";

type RegistrationStatus =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success"; coachName: string }
  | { state: "error"; message: string };

type FormState = {
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  childName: string;
  ageGroup: string;
  message: string;
  // Honeypot — never shown to humans, bots love filling every field.
  company: string;
};

const AGE_GROUP_OPTIONS = ["U7", "U8", "U9", "U10", "U11", "U12"] as const;

const EMPTY_FORM: FormState = {
  parentName: "",
  parentEmail: "",
  parentPhone: "",
  childName: "",
  ageGroup: "",
  message: "",
  company: "",
};

// Generate the wa.me deep-link with a pre-filled message so the parent's
// first WhatsApp turn is already framed for the coach. We append the page
// URL to the message so coaches can see which landing page produced the
// click, useful for attribution if a coach has multiple shareable links.
function whatsappLink(coach: CoachProfile, prefilledChild?: string): string | null {
  if (!coach.whatsappE164) return null;
  const childPart = prefilledChild ? ` for ${prefilledChild}` : "";
  const here = typeof window !== "undefined" ? window.location.href : "https://grass2pro.com";
  const text = encodeURIComponent(
    `Hi ${coach.name.split(" ")[0]}, I'd like to register${childPart} for football. (via ${here})`,
  );
  return `https://wa.me/${coach.whatsappE164}?text=${text}`;
}

export default function CoachLandingPage({ coach }: { coach: CoachProfile }) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [status, setStatus] = useState<RegistrationStatus>({ state: "idle" });
  const [showForm, setShowForm] = useState(false);

  // Drop a "coach landing page" data attribute on <html> so the global theme
  // overrides in index.css can flip to dark + brand-on without affecting any
  // other surface. We also force-light-text on the body so iOS dark mode
  // doesn't override our explicit brand colours.
  useEffect(() => {
    const previous = document.documentElement.dataset.surface;
    document.documentElement.dataset.surface = "coach-landing";
    return () => {
      if (previous === undefined) delete document.documentElement.dataset.surface;
      else document.documentElement.dataset.surface = previous;
    };
  }, []);

  // Capture ?src= in the URL so we can record the share-channel that drove
  // the click (whatsapp / instagram / facebook / qr). Falls back to "direct".
  const source = useMemo(() => {
    if (typeof window === "undefined") return "direct";
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("src");
    if (!raw) return "direct";
    return raw.toLowerCase().slice(0, 40);
  }, []);

  const waLink = whatsappLink(coach, form.childName.trim() || undefined);

  function handleField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (status.state === "submitting") return;
    setStatus({ state: "submitting" });

    try {
      const response = await fetch("/api/coach-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coachSlug: coach.slug,
          parentName: form.parentName.trim(),
          parentEmail: form.parentEmail.trim(),
          parentPhone: form.parentPhone.trim(),
          childName: form.childName.trim(),
          ageGroup: form.ageGroup,
          message: form.message.trim(),
          source,
          company: form.company, // honeypot
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus({
          state: "error",
          message: payload?.error || "Something went wrong. Please try again or message the coach on WhatsApp.",
        });
        return;
      }
      setStatus({ state: "success", coachName: payload?.coach || coach.name });
      setForm(EMPTY_FORM);
    } catch {
      setStatus({
        state: "error",
        message: "Network error. Please try again or message the coach on WhatsApp.",
      });
    }
  }

  return (
    <div className="coach-landing">
      <header className="coach-landing-topbar">
        <a
          className="coach-landing-brand"
          href="/"
          aria-label="Back to Grass2Pro homepage"
          data-testid="link-coach-to-home"
        >
          <span className="coach-landing-brand-mark">G2P</span>
          <span className="coach-landing-brand-text">Grass2Pro</span>
        </a>
      </header>

      <main className="coach-landing-main">
        <section className="coach-landing-hero">
          <div className="coach-landing-hero-photo">
            <img
              src={coach.heroSrc || coach.avatarSrc}
              alt={`${coach.name}, coach`}
              loading="eager"
              decoding="async"
              width={900}
              height={1140}
            />
          </div>
          <div className="coach-landing-hero-text">
            <div className="coach-landing-kicker">Head of Recruitment | PurePro Elite</div>
            <h1 className="coach-landing-name">{coach.name}</h1>
            <p className="coach-landing-tagline">{renderTagline(coach)}</p>
            {coach.credentials && coach.credentials.length > 0 ? (
              <ul className="coach-landing-credentials" aria-label="Credentials">
                {coach.credentials.map((credential) => (
                  <li key={credential}>{credential}</li>
                ))}
              </ul>
            ) : null}
            <p className="coach-landing-bio">{coach.bio}</p>
            <button
              type="button"
              className="coach-landing-cta"
              onClick={() => {
                setShowForm(true);
                // Defer scroll a tick so the form has mounted before we scroll.
                setTimeout(() => {
                  document.getElementById("coach-landing-register")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 30);
              }}
              data-testid="button-register-cta"
            >
              <span>Register with {coach.name.split(" ")[0]}</span>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M9 8l5 4-5 4" />
              </svg>
            </button>
          </div>
        </section>

        <section className="coach-landing-block" aria-labelledby="coach-landing-specialisms-heading">
          <h2 id="coach-landing-specialisms-heading" className="coach-landing-block-title">What I do</h2>
          <ul className="coach-landing-specialisms">
            {coach.specialisms.map((spec) => (
              <li key={spec}>
                <span className="coach-landing-specialisms-dot" aria-hidden="true" />
                <span>{spec}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="coach-landing-meta-grid">
          <div className="coach-landing-meta-card">
            <div className="coach-landing-meta-label">Age groups</div>
            <div className="coach-landing-meta-value">{coach.ageGroups}</div>
          </div>
          <div className="coach-landing-meta-card">
            <div className="coach-landing-meta-label">Location</div>
            <div className="coach-landing-meta-value">{coach.location}</div>
          </div>
          <div className="coach-landing-meta-card">
            <div className="coach-landing-meta-label">Pricing</div>
            <div className="coach-landing-meta-value">{coach.pricingNote}</div>
          </div>
        </section>

        <section
          id="coach-landing-register"
          className={`coach-landing-register ${showForm ? "is-open" : ""}`}
          aria-labelledby="coach-landing-register-heading"
        >
          <div className="coach-landing-register-inner">
            <h2 id="coach-landing-register-heading" className="coach-landing-block-title">
              Register with {coach.name.split(" ")[0]}
            </h2>
            <p className="coach-landing-register-blurb">
              Share a few details and {coach.name.split(" ")[0]} will reply directly to talk through fit, schedule and the next session.
            </p>

            {status.state === "success" ? (
              <div className="coach-landing-success" role="status">
                <div className="coach-landing-success-tick" aria-hidden="true">✓</div>
                <h3>Sent — {status.coachName} will be in touch.</h3>
                <p>Check your inbox in the next 24 hours. If you don't hear back, message {status.coachName.split(" ")[0]} on WhatsApp.</p>
                {waLink ? (
                  <a className="coach-landing-secondary" href={waLink} target="_blank" rel="noopener">
                    Open WhatsApp
                  </a>
                ) : null}
              </div>
            ) : (
              <form className="coach-landing-form" onSubmit={submit} noValidate>
                <label className="coach-landing-field">
                  <span>Your name</span>
                  <input
                    type="text"
                    autoComplete="name"
                    required
                    value={form.parentName}
                    onChange={(e) => handleField("parentName", e.target.value)}
                    data-testid="input-parent-name"
                  />
                </label>
                <label className="coach-landing-field">
                  <span>Email</span>
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={form.parentEmail}
                    onChange={(e) => handleField("parentEmail", e.target.value)}
                    data-testid="input-parent-email"
                  />
                </label>
                <label className="coach-landing-field">
                  <span>Phone <span className="coach-landing-field-hint">(optional)</span></span>
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={form.parentPhone}
                    onChange={(e) => handleField("parentPhone", e.target.value)}
                    data-testid="input-parent-phone"
                  />
                </label>
                <label className="coach-landing-field">
                  <span>Child's name</span>
                  <input
                    type="text"
                    required
                    value={form.childName}
                    onChange={(e) => handleField("childName", e.target.value)}
                    data-testid="input-child-name"
                  />
                </label>
                <label className="coach-landing-field">
                  <span>Age group</span>
                  <select
                    required
                    value={form.ageGroup}
                    onChange={(e) => handleField("ageGroup", e.target.value)}
                    data-testid="select-age-group"
                  >
                    <option value="">Pick one</option>
                    {AGE_GROUP_OPTIONS.map((group) => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </label>
                <label className="coach-landing-field coach-landing-field-wide">
                  <span>Anything else? <span className="coach-landing-field-hint">(optional)</span></span>
                  <textarea
                    rows={4}
                    value={form.message}
                    onChange={(e) => handleField("message", e.target.value)}
                    placeholder="Current team, what you're hoping for, availability, etc."
                    data-testid="input-message"
                  />
                </label>

                {/* Honeypot — hidden from humans, bots fill it. */}
                <label aria-hidden="true" className="coach-landing-honeypot">
                  Company
                  <input type="text" tabIndex={-1} autoComplete="off" value={form.company} onChange={(e) => handleField("company", e.target.value)} />
                </label>

                {status.state === "error" ? (
                  <div className="coach-landing-error" role="alert">{status.message}</div>
                ) : null}

                <div className="coach-landing-form-actions">
                  <button
                    type="submit"
                    className="coach-landing-cta coach-landing-cta-submit"
                    disabled={status.state === "submitting"}
                    data-testid="button-submit-registration"
                  >
                    {status.state === "submitting" ? "Sending…" : `Register with ${coach.name.split(" ")[0]}`}
                  </button>
                  {waLink ? (
                    <a className="coach-landing-secondary" href={waLink} target="_blank" rel="noopener">
                      Or message {coach.name.split(" ")[0]} on WhatsApp
                    </a>
                  ) : null}
                </div>
              </form>
            )}
          </div>
        </section>
      </main>

      <footer className="coach-landing-footer">
        <div>
          <span className="coach-landing-footer-mark">G2P</span> Grass2Pro · Built for grassroots football
        </div>
        <a href="https://grass2pro.com">grass2pro.com</a>
      </footer>
    </div>
  );
}

// Standalone "coach not found" view rendered when /c/:slug doesn't match any
// known profile. Kept inside this file so the router only has one import.
export function CoachNotFoundPage({ slug }: { slug: string }) {
  useEffect(() => {
    document.documentElement.dataset.surface = "coach-landing";
    return () => { delete document.documentElement.dataset.surface; };
  }, []);

  return (
    <div className="coach-landing">
      <header className="coach-landing-topbar">
        <a
          className="coach-landing-brand"
          href="/"
          aria-label="Back to Grass2Pro homepage"
          data-testid="link-coach-to-home"
        >
          <span className="coach-landing-brand-mark">G2P</span>
          <span className="coach-landing-brand-text">Grass2Pro</span>
        </a>
      </header>
      <main className="coach-landing-main coach-landing-empty">
        <h1>Coach not found</h1>
        <p>We couldn't find a coach for <code>/c/{slug}</code>. Check the link, or head back to the main site.</p>
        <a className="coach-landing-cta" href="/">Go to Grass2Pro</a>
      </main>
    </div>
  );
}
