"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * The category the page being viewed is "about", for pages that have one.
 *
 * `/search` puts its category in the URL, so the header reads it from there. A
 * listing page cannot: `/rental/<slug>` carries no category, and the header sits
 * *above* the page in the tree, so the page cannot hand it down as a prop.
 * A context provided above both is the only direction that works — the listing
 * page publishes what it is showing, and the header reads it.
 *
 * Deliberately not persisted anywhere: it describes the current page only, and
 * is cleared when that page unmounts.
 */
const ActiveCategoryContext = createContext({
  categorySlug: "",
  rentalType: "",
  setActiveCategory: () => {},
});

export function ActiveCategoryProvider({ children }) {
  const [active, setActive] = useState({ categorySlug: "", rentalType: "" });

  const setActiveCategory = useCallback((next) => {
    setActive({ categorySlug: next?.categorySlug ?? "", rentalType: next?.rentalType ?? "" });
  }, []);

  const value = useMemo(
    () => ({ ...active, setActiveCategory }),
    [active, setActiveCategory],
  );

  return <ActiveCategoryContext.Provider value={value}>{children}</ActiveCategoryContext.Provider>;
}

/** @returns {{categorySlug: string, rentalType: string, setActiveCategory: Function}} */
export const useActiveCategory = () => useContext(ActiveCategoryContext);
