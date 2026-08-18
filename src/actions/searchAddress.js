"use server";

import { fetchAPI } from "@/lib/api";

const MIN_QUERY_LENGTH = 3;

/**
 * POST /mapboxapi — address autocomplete.
 *
 * The API proxies Mapbox server-side, so this app needs no Mapbox token of its
 * own. The endpoint answers with a bare `{ suggestions: [...] }` and no envelope,
 * hence `raw: true`.
 *
 * Each suggestion carries a `context` block that pre-splits the address, which is
 * what lets picking one fill Country / State / City / Postal Code in one go.
 *
 * @param {string} query
 * @returns {Promise<Array<{label: string, line1: string, city: string, state: string, country: string, postalCode: string}>>}
 */
export const searchAddress = async (query) => {
  const text = String(query ?? "").trim();
  if (text.length < MIN_QUERY_LENGTH) return [];

  try {
    const data = await fetchAPI("mapboxapi", {
      method: "POST",
      body: { text },
      raw: true,
    });

    const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : [];

    return suggestions.map((suggestion) => {
      const context = suggestion?.context ?? {};

      const city = context.place?.name || "";
      const state = context.region?.name || "";

      return {
        label: suggestion?.full_address || suggestion?.name || "",
        line1: suggestion?.name || suggestion?.full_address || "",
        city,
        state,
        country: context.country?.name || "",
        postalCode: context.postcode?.name || "",
        /**
         * The town, for the listing search's `current_city` filter. That field
         * matches a listing's own city exactly, so it must be handed "Ikeja" and
         * never "52a Kofo Abayomi St, Victoria Island, Lagos" — hence the split:
         * `label` is shown to the user, `place` is what travels to the API.
         */
        place: city || state || suggestion?.name || "",
      };
    });
  } catch (error) {
    console.error("ADDRESS SEARCH failed", error);
    return [];
  }
};
