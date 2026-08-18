"use server";

import { fetchAPI } from "@/lib/api";
import { getUserSession } from "@/actions/getUserSession";
import { SERVICE_TYPES } from "@/lib/constants";
import { toOrderViewModels, toPagination } from "@/utils/mappers";

const DEFAULT_PER_PAGE = 10;

/**
 * POST /orderList — the signed-in user's rental bookings.
 *
 * `type` is pinned to Rental: this app only ever shows rental bookings, never
 * marketplace orders. Each row is one service booked for a date range, so there
 * is no nested item array to unpack.
 *
 * @param {{page?: number, perPage?: number, status?: string, typeFilter?: string}} [options]
 *   `status` maps to the API's numeric filter (`''` = every status);
 *   `typeFilter` is the API's `type_filter` booking window (`today` | `upcoming`).
 * @returns {Promise<{status: boolean, message: string, orders: object[], pagination: object}>}
 */
export const getOrders = async ({
  page = 1,
  perPage = DEFAULT_PER_PAGE,
  status = "",
  typeFilter = "",
} = {}) => {
  const { userId, token } = await getUserSession();

  if (!userId) {
    return {
      status: false,
      message: "Not signed in.",
      orders: [],
      pagination: toPagination(null, perPage),
    };
  }

  const data = await fetchAPI("orderList", {
    method: "POST",
    body: {
      user_id: userId,
      type: SERVICE_TYPES.RENTAL,
      page: String(page),
      per_page: perPage,
      // Sent only when set — an empty `status` means "every status" to the API,
      // but an empty `type_filter` narrows to nothing.
      ...(status ? { status } : {}),
      ...(typeFilter ? { type_filter: typeFilter } : {}),
    },
    token,
  });

  const response = data?.response ?? {};

  return {
    status: Boolean(data?.status),
    message: data?.message ?? "",
    orders: toOrderViewModels(response.orderList),
    pagination: toPagination(response.pagination, perPage),
  };
};
