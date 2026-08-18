"use client";

import { createContext, useContext } from "react";
import { FUEL_TYPES, FURNISHING_STATUSES, TRANSMISSION_TYPES } from "@/lib/constants";

/**
 * The rental attribute enums, resolved server-side from `getConfigMarketPlace`.
 *
 * A context rather than props because the same three lists are needed by the
 * hero's attribute panel (layout -> Header -> SearchForm -> HeroExtraPanel) and
 * by the results-page filter modal (page -> ListingFilters -> FiltersModal ->
 * HeroExtraPanel). Threading them down both chains would be four levels of
 * drilling twice over, for a value that never changes within a render.
 *
 * The default is the compiled-in fallback, so a component rendered outside the
 * provider — a test, a future route that forgets it — still gets usable lists
 * instead of empty selects.
 */
const RentalOptionsContext = createContext({
  fuelTypes: FUEL_TYPES,
  transmissionTypes: TRANSMISSION_TYPES,
  furnishingStatuses: FURNISHING_STATUSES,
});

/**
 * @param {object} props
 * @param {{fuelTypes: object[], transmissionTypes: object[], furnishingStatuses: object[]}} props.value
 *   Resolved by the root layout; a plain server-fetched object, so it is stable
 *   for the whole render and needs no memo.
 */
export function RentalOptionsProvider({ value, children }) {
  return <RentalOptionsContext.Provider value={value}>{children}</RentalOptionsContext.Provider>;
}

/** @returns {{fuelTypes: object[], transmissionTypes: object[], furnishingStatuses: object[]}} */
export const useRentalOptions = () => useContext(RentalOptionsContext);
