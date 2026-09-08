"use server";

import { API_TYPES, fetchAPI } from "@/lib/api";

/**
 * POST {API_V2_URL}/createAccount — registers a new member.
 *
 * `multipart/form-data`, built by `<SignUp />` and forwarded verbatim, so this
 * app and the ecommerce storefront post byte-identical payloads to the one
 * account API.
 *
 * No session is issued here: `createAccount` emails a verification code, and
 * `<SignUp />` hands off to `/verify-otp`, which is what turns a verified email
 * into a session.
 *
 * @param {FormData} payload
 * @returns {Promise<{status: boolean, message: string, response: object}>}
 */
export const registerUser = async (payload) => {
  return fetchAPI(
    "createAccount",
    { method: "POST", body: payload, isFormData: true },
    API_TYPES.V2,
  );
};
