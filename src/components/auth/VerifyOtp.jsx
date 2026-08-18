"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/toastContext";
import { verifyOtp } from "@/actions/verifyOtp";
import { sendOtp } from "@/actions/sendOtp";
import { storeUserSession } from "@/actions/storeUserSession";
import { getUserProfile } from "@/actions/getUserProfile";
import { toggleWishlist } from "@/actions/toggleWishlist";
import { useAuth } from "@/context/authContext";
import { OTP_FLOWS } from "@/lib/constants";
import {
  clearOtpFlow,
  emptySnapshot,
  peekOtpUserId,
  readOtpEmail,
  readOtpFlow,
  startPasswordReset,
  subscribeNever,
} from "@/utils/otpSession";
import { mergeGuestWishlist } from "@/utils/guestWishlist";
import { takeAuthRedirect } from "@/utils/authRedirect";
import OtpInput from "./OtpInput";

const OTP_LENGTH = 6;

/** How long a code is good for, matching the storefront's window. */
const OTP_TTL_SECONDS = 120;

/**
 * Step 2 of both OTP journeys. Where a verified code leads depends on which one
 * sent the user here:
 *
 *   forgot password  -> /reset-password  (carrying the user id the API returns)
 *   unverified login -> a session, then wherever they were originally heading
 */
export default function VerifyOtp() {
  const toast = useToast();
  const router = useRouter();
  const { setUser } = useAuth();

  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL_SECONDS);

  // Two primitive snapshots rather than one object: `useSyncExternalStore`
  // requires a referentially stable value, and a fresh object would loop.
  const email = useSyncExternalStore(subscribeNever, readOtpEmail, emptySnapshot);
  const flow = useSyncExternalStore(subscribeNever, readOtpFlow, emptySnapshot);

  const hasExpired = secondsLeft === 0;

  /**
   * Set the moment a verified code hands off to the next screen.
   *
   * `email` is read live from sessionStorage and the hand-off clears it, so the
   * render that follows sees no pending code. Without this the guard below would
   * read that as "landed here with nothing to verify" and redirect to /login,
   * cancelling the navigation that just succeeded — which is exactly how a
   * verified reset code ended up back on the login screen.
   *
   * State, not a ref: it is set before the clear, so the guard is guaranteed to
   * see it on the same render that first sees the emptied `email`.
   */
  const [hasHandedOff, setHasHandedOff] = useState(false);

  useEffect(() => {
    if (hasHandedOff) return;
    // Landing here directly, with no pending code, leaves nothing to verify.
    if (!email) router.replace("/login");
  }, [hasHandedOff, email, router]);

  useEffect(() => {
    if (secondsLeft === 0) return undefined;
    const timer = setInterval(() => setSecondsLeft((prev) => Math.max(prev - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const formattedTime = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(
    secondsLeft % 60,
  ).padStart(2, "0")}`;

  const onSubmit = async () => {
    if (otp.length < OTP_LENGTH || isVerifying) return;

    setIsVerifying(true);
    try {
      const res = await verifyOtp({ email, otp });

      if (!res?.status) {
        // Still on this screen with the code still pending, so the guard stays armed.
        toast.error(res?.message || "That code is not valid.");
        return;
      }

      // Every path below navigates away, and each clears the pending flow on the
      // way out. Disarm the guard first, or it will cancel that navigation.
      setHasHandedOff(true);

      // The code checked out, so the candidate `sendOTP` parked may now be
      // promoted. Preferring `verifyOTP`'s own id keeps that authoritative when
      // it supplies one; the fallback is what stops a response without an id
      // from stranding a verified user short of the reset screen.
      const userId = res.userId || peekOtpUserId();
      const nextFlow = flow || readOtpFlow();
      clearOtpFlow();

      if (nextFlow === OTP_FLOWS.FORGOT_PASSWORD) {
        if (!userId) {
          // Nothing to reset against, and `resetPassword` answers "Password
          // changed successfully" even for an id that matches no row — so
          // continuing would report a reset that never happened.
          toast.error("Verification succeeded, but we could not identify the account. Please try again.");
          router.replace("/forgot-password");
          return;
        }

        startPasswordReset(userId);
        toast.success(res.message || "Code verified. Choose a new password.");
        router.replace("/reset-password");
        return;
      }

      // Account verification: the email is now confirmed, so issue the session.
      if (!userId) {
        toast.success(res.message || "Email verified. Please sign in.");
        router.replace("/login");
        return;
      }

      await storeUserSession({
        userId,
        token: res.response?.token ?? res.response?.access_token ?? "",
      });

      const profile = await getUserProfile();
      if (profile?.status) setUser(profile.user);

      // Hearts tapped while signed out — replay them now the session exists.
      const merged = await mergeGuestWishlist(toggleWishlist);

      toast.success(res.message || "Email verified.");
      if (merged > 0) {
        toast.info(`${merged} saved ${merged === 1 ? "listing" : "listings"} added to your wishlist.`);
      }

      router.replace(takeAuthRedirect());
      router.refresh();
    } catch (error) {
      console.error("VERIFY OTP failed", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const onResend = async (event) => {
    event.preventDefault();
    if (isResending) return;

    setIsResending(true);
    try {
      const res = await sendOtp({ email });

      if (!res?.status) {
        toast.error(res?.message || "Unable to resend the code.");
        return;
      }

      // Only restart the clock on a code that was actually sent.
      setOtp("");
      setSecondsLeft(OTP_TTL_SECONDS);
      toast.success(res.message || "We sent you a new code.");
    } catch (error) {
      console.error("RESEND OTP failed", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <section className="authentication-wrapper">
      <div className="container">
        <div className="authentication-sec">
          <div
            className="authentication-logo"
            style={{ backgroundImage: "url(/images/auth-bg.jpg)" }}
          >
            <div className="auth-logo-img" title="Legally">
              <Image src="/images/auth-logo.svg" alt="Legally" width={50} height={50} priority />
            </div>
            <div className="welcome-text">
              <div className="welcome-title">Verification Code</div>
              <span>
                We&apos;ve sent a {OTP_LENGTH}-digit verification code to your email address
                {email ? ` (${email})` : ""}
              </span>
            </div>
          </div>

          <div className="authentication-box verification-otp">
            <div className="otp-verification-form">
              <OtpInput
                value={otp}
                onChange={setOtp}
                numInputs={OTP_LENGTH}
                onSubmit={onSubmit}
                disabled={isVerifying}
                idPrefix="verificationOtp"
              />

              <div className="submit-btn mb-0">
                <button
                  type="button"
                  className="btn btn-green"
                  disabled={isVerifying || !email || otp.length < OTP_LENGTH}
                  onClick={onSubmit}
                >
                  {isVerifying ? "Verifying…" : "Verify"}
                </button>
              </div>

              <div className="mt-3">
                {hasExpired ? (
                  <p className="sign-up-content">
                    Didn&apos;t get a code?{" "}
                    <a href="#" onClick={onResend} style={{ cursor: "pointer" }}>
                      {isResending ? "Sending…" : "Resend Code"}
                    </a>
                  </p>
                ) : (
                  <p className="time-remaining-title">
                    Time Remaining: <span>{formattedTime}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
