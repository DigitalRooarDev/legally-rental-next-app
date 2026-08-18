"use server";

import { fetchAPI } from "@/lib/api";
import { getUserSession } from "@/actions/getUserSession";
import { toPagination, toTransactionViewModels } from "@/utils/mappers";

/**
 * The API's own page size. Not sent as `per_page` — the endpoint ignores it and
 * answers with 20 regardless, so this only seeds `toPagination`'s fallback.
 */
const API_PER_PAGE = 20;

/**
 * POST /transactionHistory — the wallet ledger.
 *
 * This is the endpoint the wallet tab was missing. `getTransactions`,
 * `transactionList` and `walletHistory` all 404 on both bases, which is why the
 * README recorded it as unavailable; the real name is `transactionHistory`, and
 * it is on **v1** (v2 404s).
 *
 * The user id comes from the session cookie rather than an argument: a
 * client-supplied id would let anyone read anyone else's ledger.
 *
 * `walletAmount` is returned alongside because this response carries it, and it
 * is fresher than the copy cached on the profile.
 *
 * @param {{page?: number}} [options]
 * @returns {Promise<{status: boolean, message: string, transactions: object[],
 *   walletAmount: string, pagination: object}>}
 */
export const getTransactionHistory = async ({ page = 1 } = {}) => {
  const { userId, token } = await getUserSession();

  if (!userId) {
    return {
      status: false,
      message: "Not signed in.",
      transactions: [],
      walletAmount: "",
      pagination: toPagination(null, API_PER_PAGE),
    };
  }

  const data = await fetchAPI("transactionHistory", {
    method: "POST",
    body: { user_id: String(userId), page: String(page) },
    token,
  });

  const response = data?.response ?? {};

  return {
    status: Boolean(data?.status),
    message: data?.message ?? "",
    transactions: toTransactionViewModels(response.transactionHistory),
    walletAmount: response.walletAmount ?? "",
    pagination: toPagination(response.pagination, API_PER_PAGE),
  };
};
