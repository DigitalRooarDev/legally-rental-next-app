"use server";

import { cache } from "react";
import { fetchAPI } from "@/lib/api";
import { getUserSession } from "@/actions/getUserSession";
import { toDisputeReasons } from "@/utils/mappers";

/**
 * `POST /orderQualityReasonList` — the reasons a dispute can cite.
 *
 * A reference list, not per-booking: the body carries only `user_id`, and the same
 * rows come back for every order. `cache()`d so a page that opens the dialog twice
 * asks once.
 */
const loadDisputeReasons = cache(async (userId, token) => {
  const data = await fetchAPI("orderQualityReasonList", {
    method: "POST",
    body: { user_id: String(userId) },
    token,
  });

  return {
    status: Boolean(data?.status),
    message: data?.message || "",
    reasons: data?.status ? toDisputeReasons(data.response?.orderQualityReason) : [],
  };
});

/**
 * Fetched when the dialog opens rather than with the page.
 *
 * Most visitors never raise a dispute, so loading this list on every booking view
 * would be a request per page for a control that is usually not touched. The cost
 * of deferring it is a brief spinner inside a dialog the visitor just chose to
 * open, which is where a wait is cheapest.
 *
 * @returns {Promise<{status: boolean, message: string,
 *   reasons: Array<{value: string, label: string}>}>}
 */
export const getDisputeReasons = async () => {
  const { userId, token } = await getUserSession();

  if (!userId) {
    return { status: false, message: "Please sign in to raise a dispute.", reasons: [] };
  }

  try {
    return await loadDisputeReasons(userId, token);
  } catch (error) {
    console.error("DISPUTE REASONS failed", error);
    return { status: false, message: "Unable to load the dispute reasons.", reasons: [] };
  }
};
