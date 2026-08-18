"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/context/toastContext";
import { socialLoginUser } from "@/actions/socialLoginUser";
import { storeUserSession } from "@/actions/storeUserSession";
import { getUserProfile } from "@/actions/getUserProfile";
import { toggleWishlist } from "@/actions/toggleWishlist";
import { useAuth } from "@/context/authContext";
import { OTP_FLOWS } from "@/lib/constants";
import { startOtpFlow } from "@/utils/otpSession";
import { mergeGuestWishlist } from "@/utils/guestWishlist";
import { takeAuthRedirect } from "@/utils/authRedirect";

/**
 * Landing strip for the OAuth round trip.
 *
 * `<SocialLoginButtons />` sends the browser to `{API}/api/google`; the API talks
 * to the provider and redirects back here as
 * `/social-login?token=…&type=google|facebook`. All this screen does is trade that
 * token for a cookie session and get out of the way, so it renders a spinner
 * rather than a layout.
 */
export default function SocialLogin() {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();

  const token = searchParams.get("token");
  const type = searchParams.get("type");

  // The exchange is single-use: React 18 mounts effects twice in dev Strict Mode,
  // and a second `socialLogin` with a spent token would fail the sign-in that
  // just succeeded.
  const hasExchanged = useRef(false);

  useEffect(() => {
    if (hasExchanged.current) return;
    hasExchanged.current = true;

    // Arriving here without a token means this was not a provider redirect.
    if (!token || !type) {
      router.replace("/login");
      return;
    }

    const exchange = async () => {
      try {
        const res = await socialLoginUser({ token, type });

        if (!res?.status) {
          toast.error(res?.message || "Unable to sign in with that account.");
          router.replace("/login");
          return;
        }

        const { userId, needsOtp, email } = res.session;

        if (needsOtp) {
          startOtpFlow({ email, flow: OTP_FLOWS.VERIFY_ACCOUNT });
          toast.info(res.message || "Please verify your email to continue.");
          router.replace("/verify-otp");
          return;
        }

        if (!userId) {
          toast.error("Sign in succeeded but the account could not be loaded.");
          router.replace("/login");
          return;
        }

        await storeUserSession({ userId, token: res.session.token });

        const profile = await getUserProfile();
        if (profile?.status) setUser(profile.user);

        // Hearts tapped while signed out — replay them now the session exists.
        const merged = await mergeGuestWishlist(toggleWishlist);

        toast.success(res.message || "Signed in successfully.");
        if (merged > 0) {
          toast.info(`${merged} saved ${merged === 1 ? "listing" : "listings"} added to your wishlist.`);
        }

        // `replace`, so Back does not re-enter a URL whose token is now spent.
        router.replace(takeAuthRedirect());
        router.refresh();
      } catch (error) {
        console.error("SOCIAL LOGIN failed", error);
        toast.error("Something went wrong. Please try again.");
        router.replace("/login");
      }
    };

    exchange();
    // Intentionally keyed on the credentials alone — `router`, `toast` and
    // `setUser` are stable enough and re-running this is what the ref guards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, type]);

  return (
    <section className="authentication-wrapper">
      <div className="section-loader" role="status" aria-live="polite">
        <span className="spinner-border spinner-border-lg" aria-hidden="true" />
        <span className="visually-hidden">Signing you in…</span>
      </div>
    </section>
  );
}
