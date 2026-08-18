import { cache } from "react";
import { fetchAPI } from "@/lib/api";
import { getUserSession } from "@/actions/getUserSession";
import { toOrderDetailViewModel } from "@/utils/mappers";

/**
 * `POST /getOrderDetails` — one booking, with the full price breakdown.
 *
 * Server-only, and `cache()`d so `generateMetadata` and the page body share a
 * single request. The user id comes from the session cookie, and the API scopes
 * the lookup to it, so one member cannot read another's booking by guessing ids.
 */
const loadOrderDetails = cache(async (orderId, userId, token) => {
  const data = await fetchAPI("getOrderDetails", {
    method: "POST",
    body: { user_id: userId, order_id: String(orderId) },
    token,
  });

  if (!data?.status) {
    return { order: null, message: data?.message || "Order not found." };
  }

  return { order: toOrderDetailViewModel(data.response), message: data.message ?? "" };
});

/**
 * @param {string|number} orderId
 * @returns {Promise<{order: object|null, message: string}>}
 */
export const getOrderDetails = async (orderId) => {
  if (!orderId) return { order: null, message: "Order not found." };

  const { userId, token } = await getUserSession();

  if (!userId) return { order: null, message: "Not signed in." };

  try {
    return await loadOrderDetails(orderId, String(userId), token);
  } catch (error) {
    console.error("ORDER DETAILS failed", error);
    return { order: null, message: "Unable to load this booking right now." };
  }
};
