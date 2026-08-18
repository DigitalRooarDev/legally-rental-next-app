import { cookies } from "next/headers";
import { COOKIE_KEYS } from "@/lib/constants";

/**
 * Reads the httpOnly session cookies. Server-side only — never exposed as a
 * server action, so the token can't be pulled into the browser.
 *
 * @returns {Promise<{userId: string|undefined, token: string|undefined}>}
 */
export async function getUserSession() {
  const cookieStore = await cookies();

  return {
    userId: cookieStore.get(COOKIE_KEYS.USER_ID)?.value,
    token: cookieStore.get(COOKIE_KEYS.TOKEN)?.value,
  };
}
