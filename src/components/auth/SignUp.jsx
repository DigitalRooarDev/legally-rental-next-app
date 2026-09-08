"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { useToast } from "@/context/toastContext";
import { registerUser } from "@/actions/registerUser";
import { OTP_FLOWS } from "@/lib/constants";
import { startOtpFlow } from "@/utils/otpSession";

const schema = yup.object().shape({
  firstname: yup.string().required("First Name is required"),
  lastname: yup.string().required("Last Name is required"),
  mobile: yup.string().required("Phone Number is required").min(12, "Phone Number is too short"),
  email: yup.string().email("Invalid email").required("Email is required"),
  password: yup
    .string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
});

export default function SignUp() {
  const toast = useToast();
  const router = useRouter();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      const formData = new FormData();
      formData.append("first_name", data.firstname);
      formData.append("last_name", data.lastname);
      formData.append("email", data.email);
      formData.append("password", data.password);
      formData.append("role", "Client");
      formData.append("country_code", data?.country_code?.replace("+", ""));
      formData.append("email", data.email);
      formData.append("mobile", data?.mobile?.replace(data?.country_code, ""));
      formData.append("latitude", "");
      formData.append("longitude", "");
      formData.append("location", "");
      formData.append("fcm_device_id", "");
      formData.append("device_type", "");

      const registerUserApi = await registerUser(formData);

      if (registerUserApi?.status) {
        // The storefront parks the address in localStorage; this app's
        // `/verify-otp` reads it through `otpSession` (sessionStorage) and needs
        // the flow flag too, or a verified code lands on the reset screen.
        startOtpFlow({
          email: registerUserApi?.response?.email || data.email,
          flow: OTP_FLOWS.VERIFY_ACCOUNT,
        });
        router.push("/verify-otp");
      } else {
        toast.error(registerUserApi?.message || "Unable to create your account.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      <section className="authentication-wrapper py-70">
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
                <div className="welcome-title">Register</div>
                <span>Create an account</span>
              </div>
            </div>
            <div className="authentication-box">
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="row">
                  <div className="col-12">
                    <div className="form-group">
                      <label htmlFor="" className="form-label">
                        First Name
                      </label>
                      <input
                        type="text"
                        className={`form-control ${errors.firstname ? "is-invalid" : ""}`}
                        {...register("firstname")}
                        placeholder="Enter your First Name"
                      />
                      {errors.firstname && (
                        <div className="invalid-feedback d-block">{errors.firstname.message}</div>
                      )}
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="form-group">
                      <label htmlFor="" className="form-label">
                        Last Name
                      </label>
                      <input
                        type="text"
                        className={`form-control ${errors.lastname ? "is-invalid" : ""}`}
                        {...register("lastname")}
                        placeholder="Enter your Last Name"
                      />
                      {errors.lastname && (
                        <div className="invalid-feedback d-block">{errors.lastname.message}</div>
                      )}
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="form-group">
                      <label htmlFor="" className="form-label">
                        Phone Number
                      </label>
                      <Controller
                        name="mobile"
                        control={control}
                        render={({ field }) => (
                          <PhoneInput
                            country={"ng"}
                            value={`${field.value}`}
                            onChange={(value, data) => {
                              setValue("country_code", data.dialCode, {
                                shouldValidate: true,
                              });
                              setValue("mobile", value, {
                                shouldValidate: true,
                              });
                            }}
                            enableSearch
                            countryCodeEditable={false}
                          />
                        )}
                      />
                      {errors.mobile && (
                        <div className="invalid-feedback d-block">{errors.mobile.message}</div>
                      )}
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="form-group">
                      <label htmlFor="" className="form-label">
                        Email Address
                      </label>
                      <input
                        type="email"
                        className={`form-control ${errors.email ? "is-invalid" : ""}`}
                        {...register("email")}
                        placeholder="Enter your email address"
                      />
                      {errors.email && (
                        <div className="invalid-feedback d-block">{errors.email.message}</div>
                      )}
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="form-group">
                      <label htmlFor="" className="form-label">
                        Password
                      </label>
                      <div className={`input-group ${errors.password ? "is-invalid" : ""}`}>
                        <input
                          type={isPasswordVisible ? "text" : "password"}
                          className="form-control"
                          {...register("password")}
                          placeholder="Enter Password"
                        />
                        <span
                          className="input-group-text cursor-pointer"
                          onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                        >
                          <i
                            className={`icon ${isPasswordVisible ? "icon-show" : "icon-hide"}`}
                          ></i>
                        </span>
                      </div>
                      {errors.password && (
                        <div className="invalid-feedback d-block">{errors.password.message}</div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="submit-btn">
                  <button type="submit" className="btn btn-green" disabled={isSubmitting}>
                    Register
                  </button>
                </div>
              </form>
              <p className="sign-up-content">
                Already registered? <Link href="/login">Go to login</Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
