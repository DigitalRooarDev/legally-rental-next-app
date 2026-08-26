"use server";

import { cache } from "react";
import { fetchAPI } from "@/lib/api";
import { getUserSession } from "@/actions/getUserSession";
import { toCancellationReasons } from "@/utils/mappers";

/**
 * `POST /orderCancellationReasonList` — the reasons a booking can be cancelled for.
 *
 * `role` and `service_type` are both required and both narrow the list: the seller's
 * reasons are not the buyer's, and a Service order's are not a Rental's. This app is
 * the buyer-facing rental checkout, so it asks for exactly one combination — named
 * as constants rather than inlined, because a wrong value here returns a plausible
 * list of the wrong reasons rather than an error.
 */
const VIEWER_ROLE = "Client";
const SERVICE_TYPE = "Rental";

const loadCancellationReasons = cache(async (userId, token) => {
  const data = await fetchAPI("orderCancellationReasonList", {
    method: "POST",
    body: {
      user_id: String(userId),
      role: VIEWER_ROLE,
      service_type: SERVICE_TYPE,
    },
    token,
  });

  return {
    status: Boolean(data?.status),
    message: data?.message || "",
    reasons: data?.status ? toCancellationReasons(data.response?.orderCancellationReason) : [],
  };
});

/**
 * Fetched when the dialog opens rather than with the page — see `getDisputeReasons`
 * for the reasoning, which is the same here.
 *
 * @returns {Promise<{status: boolean, message: string,
 *   reasons: Array<{value: string, label: string}>}>}
 */
export const getCancellationReasons = async () => {
  const { userId, token } = await getUserSession();

  if (!userId) {
    return { status: false, message: "Please sign in to cancel this booking.", reasons: [] };
  }

  try {
    return await loadCancellationReasons(userId, token);
  } catch (error) {
    console.error("CANCELLATION REASONS failed", error);
    return { status: false, message: "Unable to load the cancellation reasons.", reasons: [] };
  }
};
