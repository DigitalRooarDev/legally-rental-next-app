"use server";

import { cookies } from "next/headers";
import { fetchAPI } from "@/lib/api";
import { getUserSession } from "@/actions/getUserSession";
import { COOKIE_KEYS } from "@/lib/constants";

/**
 * Revokes the access token server-side, then clears the session cookies.
 *
 * The cookies are dropped even when the API call fails — a stale token on the
 * server is far less harmful than a browser stuck in a signed-in state.
 */
export const logoutUser = async () => {
  const { token } = await getUserSession();

  if (token) {
    const data = await fetchAPI("logout", { method: "POST", token });
    if (!data?.status) {
      console.warn("LOGOUT: token revocation failed —", data?.message);
    }
  }

  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_KEYS.USER_ID);
  cookieStore.delete(COOKIE_KEYS.TOKEN);

  return { status: true, message: "Logged out." };
};
