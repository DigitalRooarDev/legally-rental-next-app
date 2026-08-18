"use client";

import { STORAGE_KEYS } from "@/lib/constants";

/**
 * The OTP journey spans three routes (`/login` or `/forgot-password` ->
 * `/verify-otp` -> `/reset-password`), so the email and the flow have to survive
 * a navigation. sessionStorage is the right store: it is throwaway state that
 * should die with the tab, and it never needs to reach the server.
 *
 * Each value is read back as a **primitive**. `useSyncExternalStore` requires a
 * referentially stable snapshot, so these must never return a fresh object.
 */

/** sessionStorage is written once before the reading route mounts, so it never changes under us. */
export const subscribeNever = () => () => {};

const read = (key) => () => {
  try {
    return sessionStorage.getItem(key) ?? "";
  } catch {
    // Safari in private mode throws on sessionStorage access.
    return "";
  }
};

const write = (key, value) => {
  try {
    sessionStorage.setItem(key, String(value));
  } catch {
    /* storage unavailable — the flow degrades to a redirect back to /login */
  }
};

/** Server snapshot for `useSyncExternalStore` — there is no sessionStorage during SSR. */
export const emptySnapshot = () => "";

export const readOtpEmail = read(STORAGE_KEYS.OTP_EMAIL);
export const readOtpFlow = read(STORAGE_KEYS.OTP_FLOW);
export const readResetUserId = read(STORAGE_KEYS.RESET_USER_ID);

/**
 * Read outside React, in the submit handler, rather than through
 * `useSyncExternalStore`: it is a fallback consulted once and never rendered, so
 * subscribing a component to it would buy nothing.
 */
export const peekOtpUserId = read(STORAGE_KEYS.OTP_USER_ID);

/**
 * @param {object} args
 * @param {string} args.email
 * @param {string} args.flow    One of `OTP_FLOWS`.
 * @param {string} [args.userId] Candidate id from `sendOTP`; see `OTP_USER_ID`.
 */
export const startOtpFlow = ({ email, flow, userId = "" }) => {
  write(STORAGE_KEYS.OTP_EMAIL, email);
  write(STORAGE_KEYS.OTP_FLOW, flow);
  // Always written, even when empty, so a candidate from an earlier attempt in
  // this tab cannot leak into a new one.
  write(STORAGE_KEYS.OTP_USER_ID, userId);
};

export const startPasswordReset = (userId) => write(STORAGE_KEYS.RESET_USER_ID, userId);

export const clearOtpFlow = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.OTP_EMAIL);
    sessionStorage.removeItem(STORAGE_KEYS.OTP_FLOW);
    sessionStorage.removeItem(STORAGE_KEYS.OTP_USER_ID);
  } catch {
    /* nothing to clean up */
  }
};

export const clearPasswordReset = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.RESET_USER_ID);
  } catch {
    /* nothing to clean up */
  }
};
