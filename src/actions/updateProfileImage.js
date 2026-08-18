"use server";

import { API_TYPES, fetchAPI } from "@/lib/api";
import { getUserSession } from "@/actions/getUserSession";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * POST {API_V2_URL}/updateProfilePicture — replaces the signed-in user's avatar.
 *
 * Takes a `File` and builds the multipart body here rather than accepting a
 * client-built FormData: that way the `user_id` comes from the session cookie and
 * cannot be overridden, and the type/size limits are enforced somewhere the
 * browser cannot skip.
 *
 * @param {File} file
 * @returns {Promise<{status: boolean, message: string, imageUrl: string}>}
 */
export const updateProfileImage = async (file) => {
  if (!file || typeof file === "string" || !file.size) {
    return { status: false, message: "Please choose an image.", imageUrl: "" };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { status: false, message: "Use a JPG, PNG or WebP image.", imageUrl: "" };
  }

  if (file.size > MAX_BYTES) {
    return { status: false, message: "Images must be 5 MB or smaller.", imageUrl: "" };
  }

  const { userId, token } = await getUserSession();

  if (!userId) {
    return { status: false, message: "Not signed in.", imageUrl: "" };
  }

  const body = new FormData();
  body.append("user_id", String(userId));
  // The API names this field `profile`, not `image`.
  body.append("profile", file, file.name || "avatar.jpg");

  const data = await fetchAPI(
    "updateProfilePicture",
    { method: "POST", body, isFormData: true, token },
    API_TYPES.V2,
  );

  return {
    status: Boolean(data?.status),
    message: data?.message ?? "",
    imageUrl: data?.response?.profileImageURL ?? "",
  };
};
