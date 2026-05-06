// Diagnostic-only endpoint: reports presence/shape of VAPID env vars
// without exposing the private key. Safe to leave in prod, but we'll
// remove it once Phase 2 push is verified end-to-end.

export default async () => {
  const pub = process.env.VAPID_PUBLIC_KEY || "";
  const priv = process.env.VAPID_PRIVATE_KEY || "";
  const subj = process.env.VAPID_SUBJECT || "";

  const fingerprint = (s) => {
    if (!s) return null;
    return {
      length: s.length,
      head: s.slice(0, 4),
      tail: s.slice(-4),
    };
  };

  const body = {
    ok: Boolean(pub && priv && subj),
    publicKey: {
      present: Boolean(pub),
      matchesExpected:
        pub ===
        "BKRxsMY8W_99iZW2ysx-K20CPqw8AHf8xs8svJ9iOnbII1xODY7jSyK95T8DwO9lMpNP0rN-WBjxRu_Y2H-0Wy4",
      ...(pub ? fingerprint(pub) : {}),
    },
    privateKey: {
      present: Boolean(priv),
      // never reveal value — fingerprint only
      fingerprint: priv ? fingerprint(priv) : null,
    },
    subject: {
      present: Boolean(subj),
      value: subj || null, // safe to show, it's just the mailto
    },
  };

  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

export const config = { path: "/_vapid-check" };
