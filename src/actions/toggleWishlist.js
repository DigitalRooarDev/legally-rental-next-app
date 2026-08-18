"use server";

import { fetchAPI } from "@/lib/api";
import { getUserSession } from "@/actions/getUserSession";

/**
 * POST /addWishList — toggles a listing in the signed-in user's wishlist.
 *
 * The endpoint is a toggle, not an add: calling it with a listing already saved
 * removes it. The user id comes from the session cookie, so this action cannot
 * be used to edit somebody else's wishlist.
 *
 * @param {{service_id: string|number}} payload
 * @returns {Promise<{status: boolean, message: string, response: object}>}
 */
export const toggleWishlist = async ({ service_id } = {}) => {
  if (!service_id) {
    return { status: false, message: "Missing listing id.", response: {} };
  }

  const { userId, token } = await getUserSession();

  if (!userId) {
    return { status: false, message: "Please sign in to save listings.", response: {} };
  }

  return fetchAPI("addWishList", {
    method: "POST",
    body: { user_id: userId, service_id: String(service_id) },
    token,
  });
};
