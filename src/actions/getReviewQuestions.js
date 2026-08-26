"use server";

import { cache } from "react";
import { fetchAPI } from "@/lib/api";
import { getUserSession } from "@/actions/getUserSession";
import { toReviewForm } from "@/utils/mappers";

/**
 * Which direction is being reviewed. The endpoint also serves `seller_to_buyer`,
 * which returns a different set of questions about a different party — this app is
 * the buyer-facing one, so it only ever asks for the buyer's view of the host.
 */
const REVIEW_FOR = "buyer_to_seller";

/**
 * `POST /reviewQuestionList` — the review form for one booking.
 *
 * Per-order, not a reference list: the response carries `review_to` and
 * `review_type` for *this* booking alongside the questions, and `submitReview` has
 * to echo both back. So it is cached per order rather than once for the session.
 */
const loadReviewQuestions = cache(async (userId, orderId, token) => {
  const data = await fetchAPI("reviewQuestionList", {
    method: "POST",
    body: {
      user_id: String(userId),
      order_id: String(orderId),
      review_for: REVIEW_FOR,
    },
    token,
  });

  return {
    status: Boolean(data?.status),
    message: data?.message || "",
    form: data?.status ? toReviewForm(data.response) : null,
  };
});

/**
 * Fetched when the dialog opens rather than with the page: most bookings are never
 * reviewed, so this would otherwise be a request per booking view for a form that
 * is usually not filled in.
 *
 * @param {string|number} orderId
 * @returns {Promise<{status: boolean, message: string,
 *   form: import('@/utils/mappers').ReviewForm|null}>}
 */
export const getReviewQuestions = async (orderId) => {
  if (!orderId) return { status: false, message: "Missing booking.", form: null };

  const { userId, token } = await getUserSession();

  if (!userId) {
    return { status: false, message: "Please sign in to leave a review.", form: null };
  }

  try {
    return await loadReviewQuestions(userId, orderId, token);
  } catch (error) {
    console.error("REVIEW QUESTIONS failed", error);
    return { status: false, message: "Unable to load the review questions.", form: null };
  }
};
