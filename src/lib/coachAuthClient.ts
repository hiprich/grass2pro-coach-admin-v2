import { apiPath } from "./apiPath";

export async function postCoachAuth(
  action: string,
  body: Record<string, unknown> = {},
): Promise<{ ok: boolean; status: number; payload: unknown }> {
  const response = await fetch(apiPath("/coach-auth"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action, ...body }),
  });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  return { ok: response.ok, status: response.status, payload };
}
