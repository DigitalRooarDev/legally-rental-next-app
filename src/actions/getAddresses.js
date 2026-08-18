"use server";

import { fetchAPI } from "@/lib/api";
import { getUserSession } from "@/actions/getUserSession";
import { toAddressViewModels } from "@/utils/mappers";

/**
 * POST /getaddresses — the signed-in user's saved addresses.
 *
 * Note the endpoint names in this family are lowercase and un-camelled:
 * `getaddresses`, `addresses`, `destroyaddresses`.
 *
 * Unlike most endpoints, `response` is a **flat array**, not an object.
 *
 * @returns {Promise<{status: boolean, message: string, addresses: object[]}>}
 */
export const getAddresses = async () => {
  const { userId, token } = await getUserSession();

  if (!userId) {
    return { status: false, message: "Not signed in.", addresses: [] };
  }

  const data = await fetchAPI("getaddresses", {
    method: "POST",
    body: { user_id: userId },
    token,
  });

  return {
    status: Boolean(data?.status),
    message: data?.message ?? "",
    addresses: toAddressViewModels(data?.response),
  };
};
