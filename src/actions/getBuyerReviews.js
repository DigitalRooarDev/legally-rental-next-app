"use server";

import { fetchAPI } from "@/lib/api";
import { getUserSession } from "@/actions/getUserSession";
import { toBuyerReviews, toPagination } from "@/utils/mappers";
import { REVIEWS_PER_PAGE } from "@/lib/constants";

const EMPTY_PAGINATION = Object.freeze({
  currentPage: 1,
  lastPage: 1,
  perPage: REVIEWS_PER_PAGE,
  total: 0,
});

const failure = (message) => ({ status: false, message, reviews: [], pagination: EMPTY_PAGINATION });

/**
 * `POST /buyerReviewList` — one page of the reviews hosts left about a member.
 *
 * The profile response already inlines the first reviews, so this is only called
 * for the pages after it; the profile page renders page one without a round trip.
 *
 * A server action reachable from the browser, so `buyerId` is argument-checked
 * rather than trusted: it is the id of the profile being read, which the client
 * holds and could change. The endpoint publishes nothing a review byline does not
 * already show, so an id belonging to someone else leaks nothing — but a
 * non-numeric one answers 500, and that is worth not asking for.
 *
 * The session token rides along when there is one. Like the profile itself these
 * reviews are public: a host reaches the page from a byline without signing in.
 *
 * @param {{buyerId: string|number, page?: number}} options
 * @returns {Promise<{status: boolean, message: string,
 *   reviews: import('@/utils/mappers').BuyerReview[], pagination: typeof EMPTY_PAGINATION}>}
 */
export const getBuyerReviews = async ({ buyerId, page = 1 } = {}) => {
  const id = String(buyerId ?? "").trim();
  if (!/^\d+$/.test(id)) return failure("Profile not found.");

  const requestedPage = Number.parseInt(page, 10);
  const safePage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const { token } = await getUserSession();

  try {
    const data = await fetchAPI("buyerReviewList", {
      method: "POST",
      body: { buyer_id: id, page: safePage, per_page: REVIEWS_PER_PAGE },
      token,
    });

    if (!data?.status) return failure(data?.message || "No reviews found.");

    return {
      status: true,
      message: data.message ?? "",
      reviews: toBuyerReviews(data.response?.reviewData),
      pagination: toPagination(data.response?.pagination, REVIEWS_PER_PAGE),
    };
  } catch (error) {
    console.error("BUYER REVIEWS failed", error);
    return failure("Unable to load these reviews right now.");
  }
};
