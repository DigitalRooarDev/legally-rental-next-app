"use server";

import { API_TYPES, fetchAPI } from "@/lib/api";
import { resolveUserId } from "@/lib/authSession";

/**
 * POST {API_V2_URL}/resetPassword — sets a new password after OTP verification.
 *
 * The endpoint answers `result: "1"` / "Password changed successfully" even when
 * `user_id` matches no row, returning `response: { id: null, … }` — so its own
 * success flag cannot be trusted on its own. The echoed `id` is the only thing
 * that distinguishes a real update from a silent no-op, and reporting the no-op
 * as success would leave someone locked out believing their password had changed.
 *
 * @param {{user_id: string|number, new_password: string, confirm_password: string}} payload
 */
export const resetPassword = async (payload) => {
  const data = await fetchAPI(
    "resetPassword",
    {
      method: "POST",
      body: payload,
    },
    API_TYPES.V2,
  );

  if (!data?.status) return data;

  if (!resolveUserId(data.response)) {
    console.error("RESET PASSWORD no-op: the API reported success but echoed no user id.");
    return {
      ...data,
      status: false,
      message: "We could not update that password. Please request a new code and try again.",
    };
  }

  return data;
};
