import { cache } from "react";
import { fetchAPI } from "@/lib/api";
import { CATEGORY_TYPES } from "@/lib/constants";

/**
 * `POST /categoryList` — the rental category tree.
 *
 * Preferred over `buyerDashboard.categoryListData`, which carries neither the
 * `icon` the hero search uses nor the sub-categories the filter bar needs. This
 * one returns both in a single call, already in `sort_order`.
 *
 * Server-only and `cache()`d: the layout (hero search) and `/search` (filter bar)
 * both need it on the same render.
 *
 * @returns {Promise<Array<{id: string, name: string, slug: string, rentalType: string,
 *   icon: string, image: string, subcategories: Array<{id: string, name: string, slug: string}>}>>}
 */
export const getCategories = cache(async () => {
  const data = await fetchAPI("categoryList", {
    method: "POST",
    body: { category_type: CATEGORY_TYPES.RENTAL },
    // Categories change rarely; an hour of cache spares every render a round trip.
    revalidate: 3600,
    tags: ["categories"],
  });

  if (!data?.status) return [];

  return (data.response?.categoryList ?? [])
    .filter((category) => category?.id)
    .map((category) => ({
      id: String(category.id),
      name: category.name || "Unnamed",
      slug: category.slug || "",
      rentalType: category.rental_type || "",
      // `icon` is the purpose-built rental web icon; `image_full_path` is the
      // generic category image and is only a fallback.
      icon: category.icon || category.image_full_path || "",
      image: category.image_full_path || "",
      subcategories: (Array.isArray(category.subcategories) ? category.subcategories : [])
        .filter((sub) => sub?.id)
        .map((sub) => ({
          id: String(sub.id),
          name: sub.name || "Unnamed",
          slug: sub.slug || "",
        })),
    }));
});
