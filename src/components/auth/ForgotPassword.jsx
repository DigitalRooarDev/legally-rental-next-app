"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useToast } from "@/context/toastContext";
import { sendOtp } from "@/actions/sendOtp";
import { OTP_FLOWS } from "@/lib/constants";
import { startOtpFlow } from "@/utils/otpSession";

const schema = yup.object().shape({
  email: yup
    .string()
    .trim()
    .required("Please enter an email address.")
    .email("Please enter a valid email address."),
});

/**
 * Step 1 of 3: email -> OTP -> new password.
 *
 * Uses `sendOTP` rather than `forgotPassword`; see the README for why.
 */
export default function ForgotPassword() {
  const toast = useToast();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema), mode: "onTouched" });

  const onSubmit = async (values) => {
    const email = values.email.trim();

    try {
      const res = await sendOtp({ email });

      if (!res?.status) {
        toast.error(res?.message || "Unable to send a code right now.");
        return;
      }

      // `res.userId` is a fallback only — `verifyOTP` has not been reliable about
      // returning an id, and `resetPassword` cannot run without one. It stays a
      // candidate until the code is verified.
      startOtpFlow({ email, flow: OTP_FLOWS.FORGOT_PASSWORD, userId: res.userId });
      toast.success(res.message || "We emailed you a verification code.");
      router.push("/verify-otp");
    } catch (error) {
      console.error("FORGOT PASSWORD failed", error);
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
              <div className="welcome-title">Forgot Password</div>
              <span>Please enter email associated with your account</span>
            </div>
          </div>

          <div className="authentication-box">
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="row">
                <div className="col-12">
                  <div className="form-group">
                    <label className="form-label" htmlFor="forgot-email">
                      Email Address
                    </label>
                    <input
                      id="forgot-email"
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
              </div>

              <div className="submit-btn mb-0">
                <button type="submit" className="btn btn-green" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Send Otp"}
                </button>
              </div>
            </form>

            {/* Not on the storefront, but this screen is otherwise a dead end. */}
            <p className="sign-up-content mt-4">
              <Link href="/login">Back to login</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
