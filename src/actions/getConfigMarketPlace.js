import { cache } from "react";
import { fetchAPI, API_TYPES } from "@/lib/api";
import {
  FUEL_TYPES,
  FURNISHING_STATUSES,
  RENTAL_CANCELLATION_POLICY_URL,
  TRANSMISSION_TYPES,
} from "@/lib/constants";

/**
 * `POST /getConfigMarketPlace` (v2) — marketplace configuration.
 *
 * Two parts are read. `rental_type_info` enumerates the attribute values a
 * rental can carry; sourcing those lists from here rather than hard-coding them
 * means a value added server-side shows up without a deploy — the hard-coded
 * `FUEL_TYPES` had already fallen behind by one (`CNG`), which is exactly the
 * drift this removes. `pages` carries the CMS addresses, of which this app needs
 * `rentalCancellationPolicy` — the terms `/cancellation-policy` frames.
 *
 * Server-only and `cache()`d: the layout resolves it once per render and hands
 * it to the client through `<RentalOptionsProvider>`. The provider passes the
 * policy URL through untouched — nothing reads it from context, because the one
 * page that needs it is a server component and calls this directly, sharing the
 * same cached result.
 *
 * @returns {Promise<{fuelTypes: Array<{value: string, label: string}>,
 *   transmissionTypes: Array<{value: string, label: string}>,
 *   furnishingStatuses: Array<{value: string, label: string}>,
 *   rentalCancellationPolicyUrl: string}>}
 */
export const getConfigMarketPlace = cache(async () => {
  /** `{key, value}` from the API; `{value, label}` is what the selects want. */
  const toOptions = (entries, fallback) => {
    const options = (Array.isArray(entries) ? entries : [])
      .filter((entry) => entry?.key)
      .map((entry) => ({ value: String(entry.key), label: entry.value || String(entry.key) }));

    // An empty list would render an unusable select; the compiled-in list is
    // stale at worst, which is better than absent.
    return options.length > 0 ? options : fallback;
  };

  try {
    const data = await fetchAPI(
      "getConfigMarketPlace",
      {
        method: "POST",
        body: { version_code: "1" },
        // Config changes rarely, and every page render needs it.
        revalidate: 3600,
        tags: ["marketplace-config"],
      },
      API_TYPES.V2,
    );

    const info = data?.status ? (data.response?.rental_type_info ?? {}) : {};
    const pages = data?.status ? (data.response?.pages ?? {}) : {};

    return {
      fuelTypes: toOptions(info.fuel_type, FUEL_TYPES),
      transmissionTypes: toOptions(info.transmission_type, TRANSMISSION_TYPES),
      furnishingStatuses: toOptions(info.furnishing_status, FURNISHING_STATUSES),
      // `pages.cancellationPolicy` is the *marketplace* one and does not apply to
      // a rental booking, so only the rental key is accepted here — falling back
      // rather than silently framing the wrong terms.
      rentalCancellationPolicyUrl:
        pages.rentalCancellationPolicy || RENTAL_CANCELLATION_POLICY_URL,
    };
  } catch (error) {
    console.error("MARKETPLACE CONFIG failed", error);

    return {
      fuelTypes: FUEL_TYPES,
      transmissionTypes: TRANSMISSION_TYPES,
      furnishingStatuses: FURNISHING_STATUSES,
      rentalCancellationPolicyUrl: RENTAL_CANCELLATION_POLICY_URL,
    };
  }
});
