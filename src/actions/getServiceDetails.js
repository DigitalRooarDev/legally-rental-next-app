import { cache } from "react";
import { fetchAPI } from "@/lib/api";
import { getUserSession } from "@/actions/getUserSession";
import { toServiceDetailViewModel } from "@/utils/mappers";

/**
 * `POST /buyerServiceDetails` — one listing.
 *
 * `service_id` takes the **slug**, not the numeric id (the Postman collection
 * sends `"luxury-3bhk-flat-with-sea-view"`), which is what lets `/rental/[slug]`
 * be the canonical URL.
 *
 * Server-only, and `cache()`d so `generateMetadata` and the page body share one
 * request instead of fetching the same listing twice per render.
 */
const loadServiceDetails = cache(async (slug, userId, token) => {
  const data = await fetchAPI("buyerServiceDetails", {
    method: "POST",
    body: { user_id: userId, service_id: slug },
    token,
  });

  if (!data?.status) {
    return { service: null, message: data?.message || "Listing not found." };
  }

  return {
    service: toServiceDetailViewModel(data.response),
    message: data.message ?? "",
  };
});

/**
 * @param {string} slug
 * @returns {Promise<{service: object|null, message: string}>} `service` is `null`
 *   for a missing listing and for a transport failure alike; `message` says which.
 */
export const getServiceDetails = async (slug) => {
  if (!slug) return { service: null, message: "Listing not found." };

  const { userId, token } = await getUserSession();

  // Anonymous reads work: `buyerServiceDetails` used to reject an empty
  // `user_id` and 500 on `"0"`, which is why this once bailed out with a
  // sign-in prompt. It now answers "Service details found" for a guest, with
  // the full payload — images, description, rental details and seller — so the
  // listing page is public and only the booking asks for a session.
  //
  // The id is still sent when there is one: it is what makes `is_favorite`
  // reflect *this* visitor's wishlist rather than always coming back false.
  try {
    const result = await loadServiceDetails(String(slug), userId ? String(userId) : "", token);

    // A signed-in read can fail for a reason that has nothing to do with the
    // listing. `buyerServiceDetails` returns a 500 ("Attempt to read property
    // insurance_accept on null") whenever `user_id` names a user this environment
    // does not have — a cookie issued against another API base, or an account
    // since deleted — because the handler dereferences the missing record without
    // checking it. Since the id only personalises `is_favorite`, retrying without
    // it keeps a public page public instead of 404ing it over a stale cookie.
    if (!result.service && userId) {
      const anonymous = await loadServiceDetails(String(slug), "", undefined);
      if (anonymous.service) return anonymous;
    }

    return result;
  } catch (error) {
    console.error("SERVICE DETAILS failed", error);
    return { service: null, message: "Unable to load this listing right now." };
  }
};
