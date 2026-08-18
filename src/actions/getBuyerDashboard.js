import { cache } from "react";
import { fetchAPI } from "@/lib/api";
import { getUserSession } from "@/actions/getUserSession";
import { SERVICE_TYPES } from "@/lib/constants";
import { toProductViewModels } from "@/utils/mappers";

/**
 * Buyer dashboard loader.
 *
 * Not a `"use server"` action — it is only ever called from server components
 * (the root layout needs the category list, the home page needs the rails), so
 * it stays a plain server-side function and skips the action bundle entirely.
 *
 * `cache()` collapses the layout's call and the page's call into a single HTTP
 * request per render. Next.js does not cache POST fetches, so without this the
 * homepage would hit the API twice on every request.
 */

const REVALIDATE_SECONDS = (() => {
  const parsed = Number.parseInt(process.env.DASHBOARD_REVALIDATE_SECONDS ?? "300", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
})();

const EMPTY_DASHBOARD = Object.freeze({
  categories: [],
  topServices: [],
  wishlist: [],
  properties: [],
  vehicles: [],
  nearby: { city: "", items: [] },
});

const loadDashboard = cache(async (type, token) => {
  const data = await fetchAPI("buyerDashboard", {
    method: "POST",
    body: { type, newApp: true },
    token,
    // A signed-in dashboard is user-specific and must never be served from a
    // shared cache; anonymous responses are identical for everyone, so cache those.
    ...(token || !REVALIDATE_SECONDS ? {} : { revalidate: REVALIDATE_SECONDS, tags: ["buyer-dashboard"] }),
  });

  if (!data?.status) {
    // The homepage still has to render, so degrade to empty rails.
    console.error("DASHBOARD: buyerDashboard failed —", data?.message);
    return { data: EMPTY_DASHBOARD, error: data?.message || "Unable to load listings." };
  }

  const response = data.response ?? {};

  return {
    data: {
      categories: Array.isArray(response.categoryListData) ? response.categoryListData : [],
      topServices: toProductViewModels(response.topServiceData),
      wishlist: toProductViewModels(response.wishListData),
      properties: toProductViewModels(response.propertyData),
      vehicles: toProductViewModels(response.vehicleData),
      nearby: {
        city: response.nearbyData?.currentCity || "",
        items: toProductViewModels(response.nearbyData?.currentCityData),
      },
    },
    error: null,
  };
});

/**
 * @param {{type?: 'Rental'|'Service'}} [options]
 * @returns {Promise<{data: typeof EMPTY_DASHBOARD, error: string|null}>}
 */
export const getBuyerDashboard = async ({ type = SERVICE_TYPES.RENTAL } = {}) => {
  const { token } = await getUserSession();
  // Primitive args only — `cache()` keys on argument identity, so an object
  // literal would defeat the per-request dedupe.
  return loadDashboard(type, token);
};
