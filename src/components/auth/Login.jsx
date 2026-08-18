"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useToast } from "@/context/toastContext";
import { loginUser } from "@/actions/loginUser";
import { storeUserSession } from "@/actions/storeUserSession";
import { getUserProfile } from "@/actions/getUserProfile";
import { toggleWishlist } from "@/actions/toggleWishlist";
import { useAuth } from "@/context/authContext";
import { OTP_FLOWS } from "@/lib/constants";
import { startOtpFlow } from "@/utils/otpSession";
import { mergeGuestWishlist } from "@/utils/guestWishlist";
import { rememberAuthRedirect, safeRedirect } from "@/utils/authRedirect";
import SocialLoginButtons from "./SocialLoginButtons";

const schema = yup.object().shape({
  email: yup
    .string()
    .trim()
    .required("Please enter an email address.")
    .email("Please enter a valid email address."),
  password: yup
    .string()
    .required("Please enter a password.")
    .min(6, "Password must be at least 6 characters."),
});

export default function Login() {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const redirectTo = safeRedirect(searchParams.get("redirect"));

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema), mode: "onTouched" });

  const onSubmit = async (values) => {
    try {
      const res = await loginUser({ email: values.email.trim(), password: values.password });

      if (!res?.status) {
        toast.error(res?.message || "Unable to sign in. Please try again.");
        return;
      }

      const { userId, token, needsOtp, email } = res.session;

      if (needsOtp) {
        // The account exists but the email is unverified — no session is issued.
        // `/verify-otp` carries no query string, so park where they were heading.
        rememberAuthRedirect(redirectTo);
        startOtpFlow({ email, flow: OTP_FLOWS.VERIFY_ACCOUNT });
        toast.info(res.message || "Please verify your email to continue.");
        router.push("/verify-otp");
        return;
      }

      if (!userId) {
        toast.error("Sign in succeeded but the account could not be loaded.");
        return;
      }

      await storeUserSession({ userId, token });

      const profile = await getUserProfile();
      if (profile?.status) setUser(profile.user);

      // Hearts tapped while signed out — replay them now the session exists.
      const merged = await mergeGuestWishlist(toggleWishlist);

      toast.success(res.message || "Signed in successfully.");
      if (merged > 0) {
        toast.info(`${merged} saved ${merged === 1 ? "listing" : "listings"} added to your wishlist.`);
      }

      // `refresh()` re-runs the server layout so the header picks up the session.
      router.replace(redirectTo);
      router.refresh();
    } catch (error) {
      console.error("LOGIN failed", error);
      toast.error("Something went wrong. Please try again.");
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
              <div className="welcome-title">Welcome Back</div>
              <span>Please login to your account</span>
            </div>
          </div>

          <div className="authentication-box">
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="row">
                <div className="col-12">
                  <div className="form-group">
                    <label className="form-label" htmlFor="login-email">
                      Email Address
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      className={`form-control ${errors.email ? "is-invalid" : ""}`}
                      placeholder="Enter your email address"
                      aria-invalid={Boolean(errors.email)}
                      {...register("email")}
                    />
                    {errors.email ? (
                      <div className="invalid-feedback d-block">{errors.email.message}</div>
                    ) : null}
                  </div>
                </div>

                <div className="col-12">
                  <div className="form-group">
                    <label className="form-label" htmlFor="login-password">
                      Password
                    </label>
                    <div className={`input-group ${errors.password ? "is-invalid" : ""}`}>
                      <input
                        id="login-password"
                        type={isPasswordVisible ? "text" : "password"}
                        autoComplete="current-password"
                        className="form-control"
                        placeholder="Enter Password"
                        aria-invalid={Boolean(errors.password)}
                        {...register("password")}
                      />
                      <button
                        type="button"
                        className="input-group-text cursor-pointer"
                        onClick={() => setIsPasswordVisible((visible) => !visible)}
                        aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                      >
                        <i
                          className={`icon ${isPasswordVisible ? "icon-show" : "icon-hide"}`}
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                    {errors.password ? (
                      <div className="invalid-feedback d-block">{errors.password.message}</div>
                    ) : null}
                  </div>
                  <div className="forgot-password">
                    <Link href="/forgot-password">Forgot Password?</Link>
                  </div>
                </div>
              </div>

              <div className="submit-btn mb-0">
                <button type="submit" className="btn btn-green" disabled={isSubmitting}>
                  {isSubmitting ? "Signing in…" : "Login"}
                </button>
              </div>

              <SocialLoginButtons redirectTo={redirectTo} />
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
