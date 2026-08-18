"use server";

import { API_TYPES, fetchAPI } from "@/lib/api";
import { toSession } from "@/lib/authSession";

/**
 * POST {API_V2_URL}/signIn — email + password sign in.
 *
 * `session` is the adapted payload; see `toSession` in `lib/authSession.js`.
 *
 * @param {{email: string, password: string}} payload
 * @returns {Promise<{status: boolean, message: string, response: object, session?: object}>}
 */
export const loginUser = async (payload) => {
  const data = await fetchAPI(
    "signIn",
    {
      method: "POST",
      body: payload,
    },
    API_TYPES.V2,
  );

  if (!data?.status) return data;

  const session = toSession(data.response, payload?.email);

  if (process.env.NODE_ENV !== "production" && !session.userId) {
    // Sign-in succeeded but no id came back — log the shape (never the values)
    // so the field name can be added to `resolveUserRecord`.
    console.warn("[loginUser] no user id in signIn response. Keys:", Object.keys(data.response ?? {}));
  }

  return { ...data, session };
};
