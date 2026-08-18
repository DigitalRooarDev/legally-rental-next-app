"use server";

import { fetchAPI } from "@/lib/api";
import { getUserSession } from "@/actions/getUserSession";

/** Fields the form owns. Anything else in the payload is dropped. */
const EDITABLE_FIELDS = [
  "name",
  "phone",
  "address_line1",
  "address_line2",
  "city",
  "state",
  "country",
  "postal_code",
  "shop_location_id",
  "shop_id",
];

/**
 * POST /addresses — creates an address, or updates one when `id` is supplied.
 *
 * The same endpoint does both: passing `id` switches it to an update, which is
 * how the reference app works too.
 *
 * `shop_location_id` / `shop_id` come from the admin/logistics base and are
 * optional here — the form lets them stay empty.
 *
 * @param {object} payload Form values, plus `id` to update instead of create.
 */
export const saveAddress = async (payload = {}) => {
  const { userId, token } = await getUserSession();

  if (!userId) {
    return { status: false, message: "Not signed in.", response: {} };
  }

  const body = EDITABLE_FIELDS.reduce(
    (accumulator, field) => {
      accumulator[field] = String(payload[field] ?? "").trim();
      return accumulator;
    },
    {
      user_id: userId,
      type: "shipping",
      same_as_shipping: false,
    },
  );

  // Presence of `id` is what turns this into an edit.
  if (payload.id) body.id = String(payload.id);

  return fetchAPI("addresses", { method: "POST", body, token });
};
