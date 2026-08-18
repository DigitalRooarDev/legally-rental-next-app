"use server";

import { fetchAPI } from "@/lib/api";
import { getUserSession } from "@/actions/getUserSession";
import { SERVICE_TYPES } from "@/lib/constants";
import { toProductViewModels } from "@/utils/mappers";

const DEFAULT_PER_PAGE = 12;

const EMPTY_PAGINATION = Object.freeze({ currentPage: 1, lastPage: 1, perPage: DEFAULT_PER_PAGE, total: 0 });

/**
 * POST /wishList — the signed-in user's saved listings.
 *
 * Returns `response.serviceList` (full service records, same shape as the
 * dashboard rails) plus `response.pagination`. Like `getUserProfile`, the user id
 * comes from the session cookie rather than the caller.
 *
 * @param {{type?: 'Rental'|'Service', page?: number, perPage?: number}} [options]
 * @returns {Promise<{status: boolean, message: string, products: object[], pagination: typeof EMPTY_PAGINATION}>}
 */
export const getWishlist = async ({
  type = SERVICE_TYPES.RENTAL,
  page = 1,
  perPage = DEFAULT_PER_PAGE,
} = {}) => {
  const { userId, token } = await getUserSession();

  if (!userId) {
    return {
      status: false,
      message: "Not signed in.",
      products: [],
      pagination: EMPTY_PAGINATION,
    };
  }

  const data = await fetchAPI("wishList", {
    method: "POST",
    body: { user_id: userId, type, page, per_page: perPage },
    token,
  });

  const response = data?.response ?? {};
  const raw = response.pagination ?? {};

  return {
    status: Boolean(data?.status),
    message: data?.message ?? "",
    // Every record here is a favourite by definition — the API does not always
    // set `is_favorite` on this endpoint, and an unfilled heart would be wrong.
    products: toProductViewModels(response.serviceList).map((product) => ({
      ...product,
      isFavorite: true,
    })),
    pagination: {
      currentPage: Number.parseInt(raw.current_page, 10) || 1,
      lastPage: Number.parseInt(raw.last_page, 10) || 1,
      perPage: Number.parseInt(raw.per_page, 10) || perPage,
      total: Number.parseInt(raw.total, 10) || 0,
    },
  };
};
