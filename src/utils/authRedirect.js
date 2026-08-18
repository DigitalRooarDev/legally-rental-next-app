"use client";

import { STORAGE_KEYS } from "@/lib/constants";

/** Where sign-in lands when nothing else was requested. */
export const DEFAULT_AUTH_REDIRECT = "/my-account";

/**
 * Only same-origin paths are honoured.
 *
 * `?redirect=` is attacker-controllable, so an absolute URL (`https://evil.test`)
 * or a protocol-relative one (`//evil.test`, which the browser resolves as
 * absolute) has to be rejected — otherwise the login page doubles as an open
 * redirect, and a phishing link could hand a freshly signed-in user straight to
 * another site.
 */
export const safeRedirect = (target) =>
  typeof target === "string" && /^\/(?!\/)/.test(target) ? target : DEFAULT_AUTH_REDIRECT;

/**
 * Parks the post-login destination across a detour.
 *
 * Two of them lose `?redirect=`: the OAuth handshake leaves this origin, and the
 * unverified-email hop lands on `/verify-otp`, which carries no params of its own.
 * sessionStorage rides along with the tab and is dropped when it closes.
 */
export const rememberAuthRedirect = (target) => {
  try {
    sessionStorage.setItem(STORAGE_KEYS.PENDING_REDIRECT, safeRedirect(target));
  } catch {
    /* storage unavailable — sign-in falls back to /my-account */
  }
};

/**
 * Reads and clears the parked destination, falling back to `/my-account`.
 *
 * Clearing on read is what keeps a stale destination from hijacking the *next*
 * sign-in in the same tab. Call it from an effect or a handler, never during
 * render — it both touches sessionStorage and mutates it.
 */
export const takeAuthRedirect = () => {
  try {
    const target = sessionStorage.getItem(STORAGE_KEYS.PENDING_REDIRECT);
    sessionStorage.removeItem(STORAGE_KEYS.PENDING_REDIRECT);
    return safeRedirect(target);
  } catch {
    return DEFAULT_AUTH_REDIRECT;
  }
};
