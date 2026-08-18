import { cache } from "react";
import { fetchAPI } from "@/lib/api";
import { getUserSession } from "@/actions/getUserSession";
import { toTimeline } from "@/utils/mappers";

/**
 * `POST /orderTimeline` — the status history of one booking.
 *
 * A separate call from `getOrderDetails`, which carries no history at all. The
 * body is `{ order_id, type }`, where `type` is the side of the transaction
 * asking: a seller sees their own view of the same booking, so the value decides
 * *which* history comes back, not merely how it is worded.
 *
 * Failure is not an error the page shows. A booking whose history cannot be
 * loaded is still a booking worth reading — the dates, the price and the host are
 * all there — so this resolves to an empty list and the block simply does not
 * render. A visitor is better served by a page missing one panel than by an error
 * in place of their receipt.
 */
const loadOrderTimeline = cache(async (orderId, viewer, token) => {
  const data = await fetchAPI("orderTimeline", {
    method: "POST",
    body: { order_id: String(orderId), type: viewer },
    token,
  });

  return data?.status ? toTimeline(data.response?.orderTimeline) : [];
});

/**
 * @param {string|number} orderId
 * @param {'Buyer'|'Seller'} [viewer]
 *   This app is the buyer-facing one, so `Buyer` is the only value it sends —
 *   named rather than inlined because the endpoint's answer depends on it, and a
 *   silent `Buyer` would be easy to miss if a seller view is ever added.
 * @returns {Promise<Array<object>>} Empty when there is no history to show.
 */
export const getOrderTimeline = async (orderId, viewer = "Buyer") => {
  if (!orderId) return [];

  const { userId, token } = await getUserSession();
  if (!userId) return [];

  try {
    return await loadOrderTimeline(orderId, viewer, token);
  } catch (error) {
    console.error("ORDER TIMELINE failed", error);
    return [];
  }
};
