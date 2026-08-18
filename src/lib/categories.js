/**
 * Category identifiers, in the two forms this app deals in.
 *
 * The URL carries the slug — `/search?category=vehicle` is readable, shareable
 * and stable if the API ever renumbers. `categoryServiceList` only takes the
 * numeric `category_id`, so the slug is resolved back to an id server-side in
 * `/search`; nothing but that resolution should ever look at the id.
 *
 * Shared by server and client deliberately: the hero writes the param, the
 * filter bar compares against it and the page reads it, and a mismatch between
 * any two of them silently drops the filter.
 */

/**
 * The token a category is addressed by in the URL.
 *
 * Falls back to the id, because `getCategories` defaults a missing `slug` to
 * `""` — without the fallback such a category would be unselectable.
 *
 * @param {{id?: string|number, slug?: string}} category
 * @returns {string}
 */
export const categoryParam = (category) => String(category?.slug || category?.id || '');

/**
 * Resolves a `?category=` token back to the category it names.
 *
 * Ids still resolve: `/search?category=766` links shared before the switch to
 * slugs, and any hand-written one, keep working.
 *
 * @param {Array<{id: string|number, slug?: string}>} categories
 * @param {string|null|undefined} token
 * @returns {object|null}
 */
export const findCategory = (categories, token) => {
  if (!token || !Array.isArray(categories)) return null;

  const value = String(token);

  return (
    categories.find((category) => category?.slug && category.slug === value) ??
    categories.find((category) => String(category?.id) === value) ??
    null
  );
};
