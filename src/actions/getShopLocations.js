"use server";

import { API_TYPES, fetchAPI } from "@/lib/api";

/**
 * Parcel shop pickers for the address form, both on the admin/logistics base
 * (`{ code: "0000", message, data }` — `fetchAPI` normalises that onto `status`).
 */

/**
 * POST {API_ADMIN_URL}/config/shop-location/list — the "Nearest Bus Stop" options.
 *
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
export const getShopLocations = async () => {
  const data = await fetchAPI("config/shop-location/list", { method: "POST" }, API_TYPES.ADMIN);

  if (!data?.status) return [];

  return (data.response?.shopLocations ?? [])
    .filter((location) => location?.id)
    .map((location) => ({ id: String(location.id), name: location.name || "Unnamed location" }));
};

/**
 * POST {API_ADMIN_URL}/config/shop/list — the "Parcel Shop" options for a location.
 *
 * The filter is an **array** of location ids, which is how the reference app
 * calls it. Without one the endpoint returns every shop in the country.
 *
 * `address` / `latitude` / `longitude` come back with each shop, so selecting one
 * can show its address without a second lookup.
 *
 * @param {string} shopLocationId
 * @returns {Promise<Array<{id: string, name: string, address: string, latitude: string, longitude: string}>>}
 */
export const getParcelShops = async (shopLocationId) => {
  if (!shopLocationId) return [];

  const data = await fetchAPI(
    "config/shop/list",
    { method: "POST", body: { shopLocationId: [String(shopLocationId)] } },
    API_TYPES.ADMIN,
  );

  if (!data?.status) return [];

  return (data.response?.shops ?? [])
    .filter((shop) => shop?.id)
    .map((shop) => {
      const location = shop.location ?? {};

      return {
        id: String(shop.id),
        name:
          shop.shopName || [shop.firstName, shop.lastName].filter(Boolean).join(" ") || "Parcel shop",
        address:
          shop.fullAddress ||
          [location.address1, location.address2, location.city, location.state, location.country, location.postcode]
            .filter(Boolean)
            .join(", "),
        latitude: location.latitude || "",
        longitude: location.longitude || "",
      };
    });
};
