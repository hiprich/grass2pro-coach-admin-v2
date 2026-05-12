// Unlocks Logo Studio for coaches who completed the lightweight /coach-registration flow.
// Real signed-in coaches use the coach session cookie; this flag only bypasses the
// coach-auth-status gate for visitors who landed on coach registration first.

export const COACH_REGISTRATION_LOGO_ACCESS_KEY =
  "g2p:coachRegistrationLogoAccess";

export function grantCoachRegistrationLogoAccess(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COACH_REGISTRATION_LOGO_ACCESS_KEY, "1");
  } catch {
    /* private mode / quota — studio still previews client-side without save */
  }
}

export function hasCoachRegistrationLogoAccess(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(COACH_REGISTRATION_LOGO_ACCESS_KEY) === "1";
  } catch {
    return false;
  }
}
