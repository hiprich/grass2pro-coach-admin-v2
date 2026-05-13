/** Normalize user/partner hex strings to #rrggbb or null. Accepts #RGB and optional leading #. */
export function normalizeHexColor(value: string | undefined | null): string | null {
  if (value == null) return null;
  let s = String(value).trim();
  if (!s) return null;
  if (!s.startsWith("#")) s = `#${s}`;
  if (/^#[0-9a-f]{3}$/i.test(s)) {
    const r = s[1];
    const g = s[2];
    const b = s[3];
    s = `#${r}${r}${g}${g}${b}${b}`;
  }
  if (/^#[0-9a-f]{6}$/i.test(s)) return s.toLowerCase();
  return null;
}
