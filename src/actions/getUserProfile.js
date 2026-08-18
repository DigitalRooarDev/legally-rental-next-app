"use server";

import { fetchAPI } from "@/lib/api";
import { getUserSession } from "@/actions/getUserSession";

/**
 * POST /getUserDetails — the signed-in user's profile.
 *
 * The user id is read from the httpOnly session cookie rather than accepted as
 * an argument: a client-supplied id would let anyone fetch anyone else's
 * profile by calling this action with a different number.
 */
export const getUserProfile = async () => {
  const { userId, token } = await getUserSession();

  if (!userId) {
    return { status: false, message: "Not signed in.", response: {} };
  }

  const data = await fetchAPI("getUserDetails", {
    method: "POST",
    body: { user_id: userId },
    token,
  });

  return {
    ...data,
    // Older responses nest the record; newer ones return it flat.
    user: data?.response?.userDetails ?? data?.response ?? null,
  };
};
