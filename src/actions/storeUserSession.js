"use server";

import { cookies } from "next/headers";
import { COOKIE_KEYS, SESSION_MAX_AGE_SECONDS } from "@/lib/constants";

/**
 * Persists the session as httpOnly cookies right after a successful login.
 *
 * The access token is deliberately kept out of localStorage: httpOnly means a
 * script injected into the page cannot read it, and `middleware.js` can still
 * gate protected routes on the user id.
 *
 * @param {{userId: string|number, token?: string}} session
 */
export async function storeUserSession({ userId, token }) {
  if (!userId) return;

  const cookieStore = await cookies();
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };

  cookieStore.set(COOKIE_KEYS.USER_ID, String(userId), options);
  if (token) cookieStore.set(COOKIE_KEYS.TOKEN, String(token), options);
}
