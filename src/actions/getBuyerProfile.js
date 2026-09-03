import { cache } from "react";
import { fetchAPI } from "@/lib/api";
import { getUserSession } from "@/actions/getUserSession";
import { toBuyerProfileViewModel } from "@/utils/mappers";

/**
 * `POST /buyerReviewProfile` — the public profile behind `/users/profile/[user_id]`.
 *
 * Server-only, and `cache()`d so `generateMetadata` and the page body share one
 * request instead of fetching the same profile twice per render.
 */
const loadBuyerProfile = cache(async (userId, token) => {
  const data = await fetchAPI("buyerReviewProfile", {
    method: "POST",
    body: { user_id: userId },
    token,
  });

  if (!data?.status) {
    return { profile: null, message: data?.message || "Profile not found." };
  }

  return { profile: toBuyerProfileViewModel(data.response), message: data.message ?? "" };
});

/**
 * Unlike `getUserProfile`, the id here is the *subject* of the page and comes from
 * the URL, not from the session — this is a public profile a host or guest reaches
 * from a review, so it must load for a signed-out visitor too. It exposes only
 * what the endpoint chooses to publish (name, city, counts, the birth decade), so
 * an arbitrary id in the URL leaks nothing a review byline does not already show.
 *
 * The session token is still sent when there is one, so the call is authenticated
 * for whatever the API scopes to it; it is not required.
 *
 * @param {string|number} userId
 * @returns {Promise<{profile: import('@/utils/mappers').BuyerProfile|null, message: string}>}
 *   `profile` is `null` for a missing member and for a transport failure alike;
 *   `message` says which.
 */
export const getBuyerProfile = async (userId) => {
  const id = String(userId ?? "").trim();

  // The endpoint answers 500 on a non-numeric `user_id`, and every id it issues is
  // digits — so a junk path segment is a 404 here rather than a round trip.
  if (!/^\d+$/.test(id)) return { profile: null, message: "Profile not found." };

  const { token } = await getUserSession();

  try {
    return await loadBuyerProfile(id, token);
  } catch (error) {
    console.error("BUYER PROFILE failed", error);
    return { profile: null, message: "Unable to load this profile right now." };
  }
};
