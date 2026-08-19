"use server";

import { cookies, headers } from "next/headers";
import { COOKIE_KEYS, SESSION_MAX_AGE_SECONDS } from "@/lib/constants";

/**
 * Whether the session cookies may carry the `Secure` attribute.
 *
 * `NODE_ENV === "production"` is the wrong test: the IP-based AWS box runs a
 * production build over plain HTTP, and a browser *silently drops* a `Secure`
 * cookie on an insecure origin. The login call would succeed, no cookie would be
 * written, and `proxy.js` would bounce the user straight back to `/login`.
 *
 * Resolution order:
 *   1. `COOKIE_SECURE` — explicit opt-in/out for deployments the headers can't
 *      describe (e.g. TLS terminated by something that strips the hint).
 *   2. `x-forwarded-proto` — set by nginx/ALB in front of `next start`.
 *   3. Absent both, assume http. Only a downgrade of cookie hardening on a
 *      connection that is already plaintext, never on a real https origin.
 *
 * A forged `x-forwarded-proto: https` can only *add* the attribute, so trusting
 * it costs nothing.
 */
async function shouldUseSecureCookies() {
  const override = process.env.COOKIE_SECURE;
  if (override) return override === "true";

  const headerStore = await headers();
  // Proxy chains append: `https, http`. The client-facing hop is the first.
  const proto = headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();

  return proto === "https";
}

/**
 * Persists the session as httpOnly cookies right after a successful login.
 *
 * The access token is deliberately kept out of localStorage: httpOnly means a
 * script injected into the page cannot read it, and `proxy.js` can still gate
 * protected routes on the user id.
 *
 * @param {{userId: string|number, token?: string}} session
 */
export async function storeUserSession({ userId, token }) {
  if (!userId) return;

  const cookieStore = await cookies();
  const options = {
    httpOnly: true,
    secure: await shouldUseSecureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };

  cookieStore.set(COOKIE_KEYS.USER_ID, String(userId), options);
  if (token) cookieStore.set(COOKIE_KEYS.TOKEN, String(token), options);
}
