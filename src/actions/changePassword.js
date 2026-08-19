"use server";

import { API_TYPES, fetchAPI } from "@/lib/api";
import { getUserSession } from "@/actions/getUserSession";


/**
 * POST {API_V2_URL}/changePassword — for a signed-in user.
 *
 * The user id comes from the session cookie, not the caller, so this action
 * cannot be used to change somebody else's password.
 *
 * @param {{old_password: string, new_password: string, confirm_password: string}} payload
 */
export const changePassword = async (payload) => {
  const { userId } = await getUserSession();

  if (!userId) {
    return { status: false, message: "Not signed in.", response: {} };
  }

  return fetchAPI(
    "changePassword",
    {
      method: "POST",
      body: { ...payload, user_id: userId },
    },
    API_TYPES.V2,
  );
};
