"use server";

import { fetchAPI } from "@/lib/api";
import { getUserSession } from "@/actions/getUserSession";

/**
 * Which side is cancelling. The endpoint accepts `Client` or `Seller`; this app is
 * the buyer-facing one, so it only ever sends the former.
 */
const CANCELLED_BY = "Client";

/**
 * `POST /rentalOrderCancel` — cancels a booking.
 *
 * The one irreversible action on this page: it releases the dates, starts whatever
 * refund the cancellation policy allows, and there is no un-cancel. The dialog
 * therefore asks for a reason before enabling it and does not offer a retry after
 * an ambiguous failure — see the catch below.
 *
 * `user_id` comes from the session cookie, never from the caller, so this cannot
 * cancel somebody else's booking.
 *
 * @param {object} input
 * @param {string|number} input.orderId  The order's numeric `id`, not its number.
 * @param {string|number} input.reasonId `rental_order_cancel_reason` — an id from
 *   `getCancellationReasons`, despite the field's name reading like free text.
 * @param {string} [input.description]   Optional: the dialog asks for "any
 *   additional information", so an empty box is a valid answer.
 * @returns {Promise<{status: boolean, message: string}>}
 */
export const cancelRentalOrder = async ({ orderId, reasonId, description } = {}) => {
  if (!orderId) return { status: false, message: "Missing booking." };
  if (!reasonId) return { status: false, message: "Choose why you are cancelling." };

  const { userId, token } = await getUserSession();

  if (!userId) return { status: false, message: "Please sign in to cancel this booking." };

  try {
    const data = await fetchAPI("rentalOrderCancel", {
      method: "POST",
      body: {
        user_id: String(userId),
        order_id: String(orderId),
        cancelled_by: CANCELLED_BY,
        rental_order_cancel_reason: String(reasonId),
        description: String(description ?? "").trim(),
      },
      token,
    });

    return {
      status: Boolean(data?.status),
      message:
        data?.message ||
        (data?.status ? "Booking cancelled." : "We could not cancel this booking."),
    };
  } catch (error) {
    console.error("CANCEL RENTAL ORDER failed", error);
    /**
     * Deliberately not "it failed": a transport error is silent about whether the
     * server processed the cancellation, and telling the visitor it failed invites
     * a second attempt on a booking that may already be cancelled.
     */
    return {
      status: false,
      message: "We could not confirm whether the cancellation went through. Please reload the page.",
    };
  }
};
