"use server";

import { fetchAPI } from "@/lib/api";
import { getUserSession } from "@/actions/getUserSession";
import { toBuyerReviews, toPagination } from "@/utils/mappers";
import { SERVICE_REVIEWS_PER_PAGE } from "@/lib/constants";

const EMPTY_PAGINATION = Object.freeze({
  currentPage: 1,
  lastPage: 1,
  perPage: SERVICE_REVIEWS_PER_PAGE,
  total: 0,
});

const failure = (message) => ({
  status: false,
  message,
  reviews: [],
  pagination: EMPTY_PAGINATION,
});

/**
 * `POST /reviewDetailsList` — one page of the reviews left on a listing.
 *
 * `reviewData` is the same record `buyerReviewList` sends, down to the
 * `seller_*` field names, so it goes through `toBuyerReviews` and renders in the
 * same card as the profile's. The naming is the API's: the questions ("Is the
 * rental as described?") are the guest's answers about the listing, not the
 * host's about the guest.
 *
 * Unlike the profile, nothing is inlined in `buyerServiceDetails` — page one is
 * fetched server-side by the listing page, and this same action serves the pager
 * from the browser afterwards.
 *
 * A server action reachable from the client, so `serviceId` is argument-checked
 * rather than trusted. It takes the **numeric id**, not the slug the page URL
 * carries; a non-numeric one answers 500.
 *
 * @param {{serviceId: string|number, page?: number}} options
 * @returns {Promise<{status: boolean, message: string,
 *   reviews: import('@/utils/mappers').BuyerReview[], pagination: typeof EMPTY_PAGINATION}>}
 */
export const getServiceReviews = async ({ serviceId, page = 1 } = {}) => {
  const id = String(serviceId ?? "").trim();
  if (!/^\d+$/.test(id)) return failure("Listing not found.");

  const requestedPage = Number.parseInt(page, 10);
  const safePage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  // Reviews on a listing are public — a guest reads them before signing in. The
  // token only rides along when there is one.
  const { token } = await getUserSession();

  try {
    const data = await fetchAPI("reviewDetailsList", {
      method: "POST",
      body: { service_id: id, page: safePage, per_page: SERVICE_REVIEWS_PER_PAGE },
      token,
    });

    // "No reviews found" is an ordinary answer here, not a failure worth
    // surfacing: the section simply does not render.
    if (!data?.status) return failure(data?.message || "No reviews found.");

    return {
      status: true,
      message: data.message ?? "",
      reviews: toBuyerReviews(data.response?.reviewData),
      pagination: toPagination(data.response?.pagination, SERVICE_REVIEWS_PER_PAGE),
    };
  } catch (error) {
    console.error("SERVICE REVIEWS failed", error);
    return failure("Unable to load these reviews right now.");
  }
};
