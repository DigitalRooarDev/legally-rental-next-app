"use server";

import { fetchAPI } from "@/lib/api";
import { toSession } from "@/lib/authSession";

/**
 * POST {API_BASE_URL}/socialLogin — exchanges an OAuth token for a session.
 *
 * The provider handshake happens entirely server-side: the buttons in
 * `<SocialLoginButtons />` are plain links to `{NEXT_PUBLIC_API_BASE_URL}/api/google`
 * (or `/api/facebook`), the API talks to the provider, and it redirects back to
 * `/social-login?token=…&type=…`. This is the last leg — trading that token for
 * the user record, which `<SocialLogin />` then turns into a cookie session.
 *
 * NB: v1, unlike `signIn`. That is where the endpoint lives.
 *
 * @param {{token: string, type: string}} payload
 * @returns {Promise<{status: boolean, message: string, response: object, session?: object}>}
 */
export const socialLoginUser = async (payload) => {
  const data = await fetchAPI("socialLogin", {
    method: "POST",
    body: payload,
  });

  if (!data?.status) return data;

  return { ...data, session: toSession(data.response) };
};
