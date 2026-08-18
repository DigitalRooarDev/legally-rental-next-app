"use server";

import { fetchAPI } from "@/lib/api";
import { getUserSession } from "@/actions/getUserSession";

/**
 * POST /destroyaddresses — removes one saved address.
 *
 * The endpoint keys off the address id alone. A session is still required here
 * so a signed-out caller cannot delete arbitrary ids, but be aware the API does
 * **not** verify the address belongs to the caller — that check is server-side
 * work for the backend team.
 *
 * @param {{id: string|number}} payload
 */
export const deleteAddress = async ({ id } = {}) => {
  if (!id) {
    return { status: false, message: "Missing address id.", response: {} };
  }

  const { userId, token } = await getUserSession();

  if (!userId) {
    return { status: false, message: "Not signed in.", response: {} };
  }

  return fetchAPI("destroyaddresses", {
    method: "POST",
    body: { id: String(id), user_id: userId },
    token,
  });
};
