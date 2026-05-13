const apiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export function apiPath(path: string): string {
  if (apiBase) return `${apiBase}${path}`;
  return `/.netlify/functions${path}`;
}

// Always attempt the same-origin Netlify Functions path when running in a
// browser. Netlify deploys serve functions on the same origin; a fully
// static host with no runtime skips the network in callers that check this.
export const apiAvailable = Boolean(apiBase) || typeof window !== "undefined";
