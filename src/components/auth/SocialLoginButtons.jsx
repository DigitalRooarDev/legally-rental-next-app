"use client";

import Image from "next/image";

import { rememberAuthRedirect } from "@/utils/authRedirect";

/**
 * Google / Facebook sign-in, shared by every screen that offers it.
 *
 * These are anchors, not buttons, and that is deliberate: the OAuth handshake is
 * a full-page redirect to the API, which talks to the provider and redirects back
 * to `/social-login?token=…&type=…`. Fetching it would be blocked by the
 * provider's framing and CORS rules.
 *
 * Renders nothing when `NEXT_PUBLIC_API_BASE_URL` is unset — an "Or login with"
 * divider above two links to `undefined/api/google` is worse than no divider.
 *
 * @param {object} props
 * @param {string} [props.redirectTo]  Path to land on afterwards, parked across the hop.
 * @param {string} [props.label="Or login with"]
 * @param {string} [props.action="Login"]  Verb in the button labels.
 */
export default function SocialLoginButtons({
  redirectTo,
  label = "Or login with",
  action = "Login",
}) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");

  if (!apiBaseUrl) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[SocialLoginButtons] NEXT_PUBLIC_API_BASE_URL is not set — social sign-in hidden.");
    }
    return null;
  }

  // Runs on click, before the browser follows the href.
  const parkRedirect = () => rememberAuthRedirect(redirectTo);

  return (
    <>
      <div className="or-divider-login mt-4 mb-4">{label}</div>
      <div className="social-login">
        <a href={`${apiBaseUrl}/api/google`} className="btn btn-google" onClick={parkRedirect}>
          <Image src="/images/google-logo.svg" alt="" width={18} height={18} aria-hidden="true" />
          {action} With Google
        </a>
        <a href={`${apiBaseUrl}/api/facebook`} className="btn btn-facebook" onClick={parkRedirect}>
          <Image src="/images/facebook-logo.svg" alt="" width={18} height={18} aria-hidden="true" />
          {action} With Facebook
        </a>
      </div>
    </>
  );
}
