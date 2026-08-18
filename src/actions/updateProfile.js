"use server";

import { API_TYPES, fetchAPI } from "@/lib/api";
import { getUserSession } from "@/actions/getUserSession";

/**
 * Fields the caller is allowed to set — anything else in the payload is dropped.
 *
 * Every one is sent on every request, empty string included. The endpoint answers
 * with a bare `[]` (no envelope, no message) if a key is merely **absent**, so
 * conditionally omitting a blank `dob` or `gender` silently broke the whole save.
 */
const EDITABLE_FIELDS = ["first_name", "last_name", "dob", "gender", "email", "mobile", "country_code"];

/**
 * POST {API_V2_URL}/updateProfile — edits the signed-in user's own profile.
 *
 * The user id is taken from the session cookie, and the payload is allow-listed
 * so a crafted call cannot reach fields the form does not own (wallet, role, …).
 *
 * @param {Record<string, string>} payload
 */
export const updateProfile = async (payload = {}) => {
  const { userId } = await getUserSession();

  if (!userId) {
    return { status: false, message: "Not signed in.", response: {} };
  }

  const body = EDITABLE_FIELDS.reduce(
    (accumulator, field) => {
      accumulator[field] = String(payload[field] ?? "").trim();
      return accumulator;
    },
    {
      user_id: userId,
      // The v2 endpoint is shared with the mobile apps and expects these present.
      device_type: "web",
      fcm_device_id: "",
    },
  );

  return fetchAPI("updateProfile", { method: "POST", body }, API_TYPES.V2);
};
