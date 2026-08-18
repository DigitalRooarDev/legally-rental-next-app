"use client";

import { useEffect } from "react";
import { useActiveCategory } from "@/context/activeCategoryContext";

/**
 * Publishes the listing's category so the header's search form can pre-select
 * it. Renders nothing.
 *
 * The cleanup matters as much as the write: navigating from a listing back to
 * the home hero must not leave the strip stuck on that listing's category, and
 * the header outlives the page it came from.
 *
 * @param {object} props
 * @param {string} [props.categorySlug]
 * @param {string} [props.rentalType] Fallback when the API omits the slug — it
 *   picks the first category of that type, which is right for every type except
 *   Equipment, where several categories share it.
 */
export default function ActiveCategoryPublisher({ categorySlug = "", rentalType = "" }) {
  const { setActiveCategory } = useActiveCategory();

  useEffect(() => {
    setActiveCategory({ categorySlug, rentalType });

    return () => setActiveCategory({ categorySlug: "", rentalType: "" });
  }, [categorySlug, rentalType, setActiveCategory]);

  return null;
}
