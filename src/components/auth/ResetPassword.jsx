"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useToast } from "@/context/toastContext";
import { resetPassword } from "@/actions/resetPassword";
import {
  clearPasswordReset,
  emptySnapshot,
  readResetUserId,
  subscribeNever,
} from "@/utils/otpSession";

const schema = yup.object().shape({
  password: yup
    .string()
    .required("Please enter a password.")
    .min(6, "Please enter at least 6 characters.")
    .max(20, "Please enter no more than 20 characters."),
  confirmPassword: yup
    .string()
    .required("Please confirm your password.")
    .oneOf([yup.ref("password")], "Passwords do not match."),
});

/** Step 3 of 3 — reachable only with the user id `verifyOTP` handed over. */
export default function ResetPassword() {
  const toast = useToast();
  const router = useRouter();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const userId = useSyncExternalStore(subscribeNever, readResetUserId, emptySnapshot);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema), mode: "onTouched" });

  /**
   * Set once the reset succeeds and this screen hands off to /login.
   *
   * `userId` is read live from sessionStorage and the hand-off clears it, so the
   * render that follows sees no pending reset. Without this the guard below would
   * read that as "arrived here without verifying", bounce to /forgot-password and
   * cancel the navigation to /login.
   *
   * State, not a ref: it is set before the clear, so the guard is guaranteed to
   * see it on the same render that first sees the emptied `userId`.
   */
  const [hasHandedOff, setHasHandedOff] = useState(false);

  useEffect(() => {
    if (hasHandedOff) return;
    // No verified OTP in this tab, so there is nothing to reset.
    if (!userId) router.replace("/forgot-password");
  }, [hasHandedOff, userId, router]);

  const onSubmit = async (values) => {
    if (!userId) return;

    try {
      const res = await resetPassword({
        user_id: userId,
        new_password: values.password,
        confirm_password: values.confirmPassword,
      });

      if (!res?.status) {
        toast.error(res?.message || "Unable to reset your password.");
        return;
      }

      // Disarm the guard before clearing, or it will redirect to /forgot-password
      // on the re-render that follows and swallow the /login navigation.
      setHasHandedOff(true);
      clearPasswordReset();
      toast.success(res.message || "Password updated. Please sign in.");
      router.replace("/login");
    } catch (error) {
      console.error("RESET PASSWORD failed", error);
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
              <div className="welcome-title">Reset Password</div>
              <span>Choose a password you have not used before</span>
            </div>
          </div>

          <div className="authentication-box">
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="row">
                <div className="col-12">
                  <div className="form-group">
                    <label className="form-label" htmlFor="new-password">
                      New Password
                    </label>
                    <div className={`input-group ${errors.password ? "is-invalid" : ""}`}>
                      <input
                        id="new-password"
                        type={isPasswordVisible ? "text" : "password"}
                        autoComplete="new-password"
                        className="form-control"
                        placeholder="Enter New Password"
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
                </div>

                <div className="col-12">
                  <div className="form-group">
                    <label className="form-label" htmlFor="confirm-password">
                      Confirm New Password
                    </label>
                    <div className={`input-group ${errors.confirmPassword ? "is-invalid" : ""}`}>
                      <input
                        id="confirm-password"
                        type={isConfirmPasswordVisible ? "text" : "password"}
                        autoComplete="new-password"
                        className="form-control"
                        placeholder="Enter New Password"
                        aria-invalid={Boolean(errors.confirmPassword)}
                        {...register("confirmPassword")}
                      />
                      <button
                        type="button"
                        className="input-group-text cursor-pointer"
                        onClick={() => setIsConfirmPasswordVisible((visible) => !visible)}
                        aria-label={isConfirmPasswordVisible ? "Hide password" : "Show password"}
                      >
                        <i
                          className={`icon ${isConfirmPasswordVisible ? "icon-show" : "icon-hide"}`}
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                    {errors.confirmPassword ? (
                      <div className="invalid-feedback d-block">{errors.confirmPassword.message}</div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="submit-btn mb-0">
                <button
                  type="submit"
                  className="btn btn-green"
                  disabled={isSubmitting || !userId}
                >
                  {isSubmitting ? "Resetting..." : "Reset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
