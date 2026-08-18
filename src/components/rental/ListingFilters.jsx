"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FiltersModal, { countActiveFilters } from "@/components/rental/FiltersModal";
import { findCategory } from "@/lib/categories";

/** Quick chips are a shortcut, not the full list — the modal holds the rest. */
const QUICK_SUBCATEGORY_COUNT = 5;

/**
 * Filter bar for `/search`: the Filter button, and the active category's most
 * common sub-categories as one-tap chips beside it.
 *
 * All state lives in the URL: results stay shareable, the back button works, and
 * the server component re-fetches on change with no client cache to keep in sync.
 *
 * @param {object} props
 * @param {Array<object>} [props.categories] Full tree; sub-categories are nested.
 */
export default function ListingFilters({ categories = [] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  const activeCategory = findCategory(categories, searchParams.get("category"));
  const activeSubcategory = searchParams.get("subcategory") ?? "";

  // Derived from the tree rather than passed down: the chips have to track the
  // category in the URL, which is the same source the modal seeds from.
  const quickSubCategories = (activeCategory?.subcategories ?? []).slice(
    0,
    QUICK_SUBCATEGORY_COUNT,
  );

  const push = (params) => {
    const query = params.toString();
    router.push(query ? `/search?${query}` : "/search");
  };

  const toggleSubcategory = (id) => {
    const params = new URLSearchParams(searchParams.toString());

    // Tapping the applied chip clears it — the chips are a toggle, not a radio
    // group, so there is always a way back to "all sub-categories".
    if (activeSubcategory === String(id)) params.delete("subcategory");
    else params.set("subcategory", String(id));

    params.delete("page");
    push(params);
  };

  const activeCount = countActiveFilters(searchParams);

  return (
    <div className="listing-filter-bar">
      <div className="filter-chips">
        <button
          type="button"
          className={`filter-trigger ${activeCount > 0 ? "has-value" : ""}`}
          onClick={() => setIsOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        >
          <i className="icon icon-filter" aria-hidden="true" />
          <span>Filter</span>
          {activeCount > 0 ? <em className="filter-trigger-count">{activeCount}</em> : null}
        </button>

        {/* {quickSubCategories.map((sub) => (
          <button
            key={sub.id}
            type="button"
            className={`filter-quick ${activeSubcategory === String(sub.id) ? "active" : ""}`}
            aria-pressed={activeSubcategory === String(sub.id)}
            onClick={() => toggleSubcategory(sub.id)}
          >
            {sub.name}
          </button>
        ))} */}
      </div>

      <FiltersModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        categories={categories}
        searchParams={searchParams}
        onApply={(params) => {
          setIsOpen(false);
          push(params);
        }}
      />
    </div>
  );
}
