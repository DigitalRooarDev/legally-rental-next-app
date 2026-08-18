"use server";

import { API_TYPES, fetchAPI } from "@/lib/api";
import { resolveUserId } from "@/lib/authSession";

/**
 * POST {API_V2_URL}/verifyOTP — confirms the emailed code.
 *
 * On success the response carries the user record, and `userId` is lifted out of
 * it here so no call site has to guess the field name: the account-verification
 * flow turns it into a session, the forgot-password flow carries it into
 * `resetPassword`, which cannot run without it.
 *
 * @param {{email: string, otp: string|number}} payload
 * @returns {Promise<{status: boolean, message: string, response: object, userId: string}>}
 */
export const verifyOtp = async (payload) => {
  const data = await fetchAPI(
    "verifyOTP",
    {
      method: "POST",
      body: payload,
    },
    API_TYPES.V2,
  );

  if (!data?.status) return { ...data, userId: "" };

  const userId = resolveUserId(data.response);

  if (!userId) {
    // Log the shape, never the values. `<VerifyOtp />` falls back to the id
    // `sendOTP` supplied, so this is a diagnostic and not a dead end — but the
    // key belongs in `resolveUserId` once it is known.
    console.warn("[verifyOtp] no user id in verifyOTP response. Keys:", Object.keys(data.response ?? {}));
  }

  return { ...data, userId };
};
