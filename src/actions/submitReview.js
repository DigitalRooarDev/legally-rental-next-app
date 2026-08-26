"use server";

import { fetchAPI } from "@/lib/api";
import { getUserSession } from "@/actions/getUserSession";

const MIN_RATING = 1;
const MAX_RATING = 5;

const isRating = (value) => Number.isInteger(value) && value >= MIN_RATING && value <= MAX_RATING;

/**
 * `POST /submitReview` — the buyer's review of one finished booking.
 *
 * `review_to` and `review_type` are passed in from `reviewQuestionList`'s response
 * rather than re-derived from the order: that call decides who the review is about,
 * and the two have to name the same party. Re-deriving `review_to` from the
 * listing's seller would attribute the review to whoever holds the listing *now*.
 *
 * One review per booking — the API sets `isReviewGiven`, which is what retires the
 * form — so nothing here retries.
 *
 * @param {object} input
 * @param {string|number} input.orderId
 * @param {string} input.reviewTo
 * @param {string} input.reviewType
 * @param {number} input.overallRating  1-5.
 * @param {string} [input.comment]
 * @param {Array<{questionId: string, rating: number, comment?: string,
 *   optionIds?: string[]}>} input.answers
 * @returns {Promise<{status: boolean, message: string}>}
 */
export const submitReview = async ({
  orderId,
  reviewTo,
  reviewType,
  overallRating,
  comment,
  answers,
} = {}) => {
  if (!orderId || !reviewTo || !reviewType) {
    return { status: false, message: "This booking cannot be reviewed." };
  }

  if (!isRating(overallRating)) {
    return { status: false, message: "Give an overall rating before submitting." };
  }

  const rows = Array.isArray(answers) ? answers : [];

  if (rows.length === 0) {
    return { status: false, message: "Answer the questions before submitting." };
  }

  if (!rows.every((answer) => answer?.questionId && isRating(answer.rating))) {
    return { status: false, message: "Rate every question before submitting." };
  }

  const { userId, token } = await getUserSession();

  if (!userId) return { status: false, message: "Please sign in to leave a review." };

  try {
    const data = await fetchAPI("submitReview", {
      method: "POST",
      body: {
        user_id: String(userId),
        order_id: String(orderId),
        review_to: String(reviewTo),
        review_type: String(reviewType),
        overall_rating: String(overallRating),
        comment: String(comment ?? "").trim(),
        answers: rows.map((answer) => ({
          question_id: String(answer.questionId),
          rating: String(answer.rating),
          /** The "Others" text. Empty when that option was not ticked. */
          comment: String(answer.comment ?? "").trim(),
          option_ids: (Array.isArray(answer.optionIds) ? answer.optionIds : []).map(String),
        })),
      },
      token,
    });

    return {
      status: Boolean(data?.status),
      message:
        data?.message ||
        (data?.status ? "Thanks for your feedback." : "We could not save your review."),
    };
  } catch (error) {
    console.error("SUBMIT REVIEW failed", error);
    return {
      status: false,
      message: "We could not confirm whether your review was saved. Please reload the page.",
    };
  }
};
