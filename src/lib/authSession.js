/**
 * Adapts the v2 auth payloads into the one shape the auth components consume.
 *
 * Both sign-in routes — `signIn` (email + password) and `socialLogin` (Google /
 * Facebook) — answer with the same loosely-specified user envelope, so the
 * normalisation lives here rather than being written twice. Keeping it out of the
 * `"use server"` action files is also a requirement, not a preference: every
 * export of a `"use server"` module has to be an async function.
 */

/**
 * Picks the object that actually carries the user record.
 *
 * The record has arrived both flat on `response` and nested under `userDetails`,
 * so this checks each candidate for an id instead of picking a container blindly —
 * `response.user` holding something that is *not* the user (a type, an id string)
 * would otherwise shadow a perfectly good flat `response.id`.
 */
const resolveUserRecord = (response) =>
  [response, response?.userDetails, response?.user].find(
    (candidate) =>
      candidate && typeof candidate === "object" && (candidate.id ?? candidate.user_id) !== undefined,
  ) ?? {};

/**
 * @param {object} [response]       The envelope's `response` object.
 * @param {string} [fallbackEmail]  Used when the response omits the email.
 * @returns {{userId: string, token: string, needsOtp: boolean, email: string}}
 */
export const toSession = (response = {}, fallbackEmail = "") => {
  const record = resolveUserRecord(response);

  return {
    userId: record.id ?? record.user_id ?? "",
    token: response.token ?? response.access_token ?? record.token ?? "",
    // `verify_otp: "1"` means the email is already verified. Anything else and
    // the account has to clear OTP before it gets a session. Compared as a
    // string because the two bases disagree: v2 `signIn` returns `"1"`,
    // `socialLogin` returns `1`.
    needsOtp: String(record.verify_otp ?? response.verify_otp ?? "1") !== "1",
    email: record.email ?? response.email ?? fallbackEmail,
  };
};

/**
 * Digs the user id out of any auth response.
 *
 * Deliberately broader than `toSession`: `verifyOTP` and `sendOTP` return only a
 * user record (no token, no `verify_otp`), and their success shapes are not
 * pinned down — staging has been seen returning the record flat on `response`,
 * and `resetPassword` answers with a flat `{ id, fcm_device_id, device_type }`.
 * The forgot-password flow cannot continue without this id, so every plausible
 * spelling is checked rather than betting the journey on one.
 *
 * @returns {string} The id, or `""` when the response carries none.
 */
export const resolveUserId = (response) => {
  const record = resolveUserRecord(response);
  const id =
    record.id ??
    record.user_id ??
    record.customer_id ??
    response?.id ??
    response?.user_id ??
    response?.customer_id;

  // `null` is a real answer from this API (see `resetPassword`), not an id.
  return id === undefined || id === null || id === "" ? "" : String(id);
};
