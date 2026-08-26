"use server";

import { fetchAPI } from "@/lib/api";
import { getUserSession } from "@/actions/getUserSession";

/**
 * `POST /disputeOrder` — raises a dispute against one booking.
 *
 * Creates a record and starts the resolution process involving the host and the
 * platform, so it is not safe to retry blindly: a caller that resends on an
 * ambiguous failure risks two disputes on one booking. The dialog closes on
 * success and offers no retry that could double-submit.
 *
 * `user_id` is taken from the session cookie, never from the caller, so this
 * cannot raise a dispute in somebody else's name.
 *
 * @param {object} input
 * @param {string|number} input.orderId  The order's numeric `id`, not its number.
 * @param {string|number} input.reasonId `order_quality_reason_id` from `getDisputeReasons`.
 * @param {string} input.description
 * @returns {Promise<{status: boolean, message: string}>}
 */
export const raiseOrderDispute = async ({ orderId, reasonId, description } = {}) => {
  if (!orderId) return { status: false, message: "Missing booking." };
  if (!reasonId) return { status: false, message: "Choose a reason for your dispute." };

  const details = String(description ?? "").trim();
  if (!details) return { status: false, message: "Describe the issue before submitting." };

  const { userId, token } = await getUserSession();

  if (!userId) return { status: false, message: "Please sign in to raise a dispute." };

  try {
    const data = await fetchAPI("disputeOrder", {
      method: "POST",
      body: {
        user_id: String(userId),
        order_id: String(orderId),
        order_quality_reason_id: String(reasonId),
        description: details,
      },
      token,
    });

    return {
      status: Boolean(data?.status),
      message:
        data?.message || (data?.status ? "Dispute submitted." : "We could not raise this dispute."),
    };
  } catch (error) {
    console.error("RAISE DISPUTE failed", error);
    /**
     * Deliberately not "it failed": a transport error is silent about whether the
     * server got the request, and telling the visitor it failed invites the second
     * submission that would create the duplicate dispute.
     */
    return {
      status: false,
      message: "We could not confirm whether your dispute was submitted. Please reload the page.",
    };
  }
};
