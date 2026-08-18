"use server";

import { API_TYPES, fetchAPI } from "@/lib/api";
import { resolveUserId } from "@/lib/authSession";

/**
 * POST {API_V2_URL}/sendOTP — emails a one-time code.
 *
 * Used for both flows: "resend my verification code" and "I forgot my password"
 * (the v1 `forgotPassword` endpoint is not usable — see the README).
 *
 * `userId` is lifted out when the response happens to carry the record, purely as
 * a fallback for the forgot-password journey: `resetPassword` needs an id, and
 * `verifyOTP` has not been reliable about returning one. It is only a *candidate*
 * — `<VerifyOtp />` promotes it to the reset key after the code checks out, never
 * before, so it cannot be used to skip verification.
 *
 * @param {{email: string}} payload
 * @returns {Promise<{status: boolean, message: string, response: object, userId: string}>}
 */
export const sendOtp = async (payload) => {
  const data = await fetchAPI(
    "sendOTP",
    {
      method: "POST",
      body: payload,
    },
    API_TYPES.V2,
  );

  return { ...data, userId: data?.status ? resolveUserId(data.response) : "" };
};
