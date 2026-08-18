'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { searchAddress } from '@/actions/searchAddress';

const PLACE_DEBOUNCE_MS = 350;
/** Matches the minimum the `mapboxapi` proxy will act on. */
const MIN_PLACE_QUERY = 3;

/**
 * Debounced destination lookup against the API's Mapbox proxy.
 *
 * Shared by the hero's Where field and the results-page filter modal, which
 * offer the same search and must not drift on debounce, minimum length, or the
 * suppression rule below.
 *
 * @param {string} query          The text currently in the box.
 * @param {string} [seededValue]  Text the box opened with — never queried.
 * @returns {{suggestions: object[], suppress: (value: string) => void, clear: () => void}}
 */
export function usePlaceSuggestions(query, seededValue = '') {
  const [suggestions, setSuggestions] = useState([]);

  /**
   * Text the autocomplete must not query, because the box was filled for the
   * user (seeded from the URL, or a suggestion they picked).
   *
   * Holds the value rather than a boolean: a boolean stayed armed whenever the
   * write turned out to be a no-op — picking the suggestion you had typed in
   * full, or re-seeding the same `?q=` — and then swallowed the next keystroke.
   */
  const suppressed = useRef(seededValue);

  useEffect(() => {
    if (suppressed.current === query) return undefined;
    suppressed.current = null;

    let cancelled = false;

    const timer = setTimeout(async () => {
      if (query.trim().length < MIN_PLACE_QUERY) {
        if (!cancelled) setSuggestions([]);
        return;
      }

      const results = await searchAddress(query);
      // Results arriving must not yank focus back if the user has already moved
      // on to another field.
      if (!cancelled) setSuggestions(results);
    }, PLACE_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // Stable identities: callers list these in effect deps, and a fresh function
  // each render would re-run those effects on every keystroke.
  const suppress = useCallback((value) => {
    suppressed.current = value;
  }, []);

  const clear = useCallback(() => setSuggestions([]), []);

  return { suggestions, suppress, clear };
}
