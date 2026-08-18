import { Suspense } from 'react';
import Link from 'next/link';
import ListingFilters from '@/components/rental/ListingFilters';
import ResultsMap from '@/components/rental/ResultsMap';
import ProductGrid from '@/components/theme/ProductGrid';
import EmptyState from '@/components/theme/EmptyState';
import PageLinks from '@/components/theme/PageLinks';
import { getServiceList } from '@/actions/getServiceList';
import { getCategories } from '@/actions/getCategories';
import { findCategory } from '@/lib/categories';

export const metadata = {
  title: 'Search rentals',
  description: 'Search verified rental listings across Nigeria on Legally Rental.',
};

/**
 * URL param -> `getServiceList` filter key. The URL is the single source of truth.
 *
 * `category` is absent on purpose: the URL holds a slug and the API wants a
 * numeric `category_id`, so it is resolved through the category list below
 * rather than passed straight through.
 */
const PARAM_TO_FILTER = {
  subcategory: 'subCategoryId',
  // The town picked from the address autocomplete — the destination filter.
  city: 'currentCity',
  // Free text. Nothing writes it today; kept so an inbound `?q=` link still works.
  q: 'search',
  minPrice: 'minPrice',
  maxPrice: 'maxPrice',
  rentalType: 'rentalType',
  startDate: 'startDate',
  endDate: 'endDate',
  guests: 'guests',
  adults: 'adults',
  children: 'children',
  maxGuests: 'maxGuests',
  // Category-specific attributes set by the hero's third field.
  fuelType: 'fuelType',
  transmissionType: 'transmissionType',
  furnishing: 'furnishingStatus',
  seats: 'seats',
  year: 'year',
  madeIn: 'madeIn',
  size: 'size',
  lat: 'latitude',
  lng: 'longitude',
  distance: 'distance',
};

const firstValue = (value) => (Array.isArray(value) ? value[0] : value);

/**
 * Everything that must survive pagination: the filters, plus the two params that
 * are deliberately absent from `PARAM_TO_FILTER` — `category`, which is resolved
 * to an id first, and `address`, which is display-only. `address` holds the full
 * address the user picked so the Where field can show it back; only the `city`
 * beside it filters, and sending a street address to `current_city` would match
 * nothing. It must never be added to `PARAM_TO_FILTER`.
 */
const CARRIED_PARAMS = ['category', 'address', ...Object.keys(PARAM_TO_FILTER)];

/**
 * The `<h1>`, composed from whatever is actually applied.
 *
 * Built from the resolved category rather than the raw `?category=` slug, so the
 * heading reads "Property rentals", never "property rentals" or the id it is
 * sent to the API as. The sub-category wins when there is one — "Boat House
 * rentals" says more than "Property rentals" once the user has narrowed that
 * far.
 *
 * @param {object} args
 * @param {{name: string}|null} [args.category]
 * @param {{name: string}|null} [args.subCategory]
 * @param {string} [args.city]
 * @param {string} [args.query]
 */
const buildListingTitle = ({ category, subCategory, city, query }) => {
  const what = subCategory?.name || category?.name;
  const base = what ? `${what} rentals` : 'Rentals';
  const located = city ? `${base} in ${city}` : base;

  return query ? `${located} matching “${query}”` : located;
};

export default async function SearchPage({ searchParams }) {
  const params = await searchParams;

  const filters = Object.entries(PARAM_TO_FILTER).reduce((accumulator, [param, key]) => {
    const value = firstValue(params?.[param]);
    if (value) accumulator[key] = value;
    return accumulator;
  }, {});

  const page = Math.max(1, Number.parseInt(params?.page ?? '1', 10) || 1);

  // Awaited before the listings rather than alongside them: the slug in the URL
  // cannot be turned into a `category_id` without this list. It costs no round
  // trip in practice — `getCategories` is `cache()`d and the layout's hero has
  // already asked for it on this same render.
  const categories = await getCategories();
  const activeCategory = findCategory(categories, firstValue(params?.category));

  // An unresolvable slug filters nothing rather than being sent as a raw string,
  // which the API would read as an unknown id and answer with zero listings.
  if (activeCategory) filters.categoryId = activeCategory.id;

  const { products, pagination, error } = await getServiceList({ filters, page });

  const hasResults = products.length > 0;

  // `categoryList` nests sub-categories, so the active one is already to hand —
  // no second request to name it in the heading.
  const activeSubCategory =
    activeCategory?.subcategories?.find(
      (sub) => String(sub.id) === String(firstValue(params?.subcategory) ?? ''),
    ) ?? null;

  const listingTitle = buildListingTitle({
    category: activeCategory,
    subCategory: activeSubCategory,
    city: firstValue(params?.city),
    query: firstValue(params?.q),
  });

  // Carried across page links so filters survive pagination.
  const carriedParams = Object.fromEntries(
    CARRIED_PARAMS.filter((param) => params?.[param]).map((param) => [
      param,
      String(firstValue(params[param])),
    ]),
  );

  return (
    <>
      <div className="listing-filter-wrapper d-none">
        <div className="container">
          <Suspense fallback={<div className="listing-filter-bar" />}>
            {/* Sub-categories come nested in `categories`, so the bar and its
                modal derive them from the URL rather than taking a second prop
                that could disagree with it. */}
            <ListingFilters categories={categories} />
          </Suspense>
        </div>
      </div>
      <section className="listing-sec">
        <div className="container listing-container">
          {error ? <div className="notice-bar">{error}</div> : null}

          <div className="listing-layout">
            <div className="listing-results">
              <div className="listing-head d-flex align-items-center justify-content-between">
                {/* Always the real title, results or not. The empty state below
                    carries its own "No exact matches" heading, so the `<h1>` no
                    longer has to double as one — which also keeps the page's
                    single `<h1>` describing the search rather than its outcome. */}
                <h1 className="listing-title">
                  {listingTitle}
                  {pagination.total > 0 ? (
                    <small className="listing-count d-block mt-1 mx-0">
                      {pagination.total.toLocaleString('en-NG')} result
                      {pagination.total === 1 ? '' : 's'}
                      {/* {pagination.lastPage > 1
                        ? ` · page ${pagination.currentPage} of ${pagination.lastPage}`
                        : ''} */}
                    </small>
                  ) : null}
                </h1>

                <ListingFilters categories={categories} />
              </div>

              {/* A sibling of `.listing-head`, not a child of it: that head is a
                  `justify-content-between` flex row, so nesting this put the copy
                  *beside* the heading and the filter button instead of under them.
                  `<EmptyState>` rather than hand-rolled markup — same component,
                  same classes as the one `<ProductGrid>` renders. */}
              {hasResults ? null : (
                <EmptyState
                  className="no-records"
                  title="No exact matches"
                  message="Try changing or removing some of your filters, or adjusting your search area."
                >
                  {/* Straight to the bare route: every filter this page reads
                      lives in the query string, so dropping it clears them
                      all — including the ones the modal owns. */}
                  <Link className="btn btn-outline" href="/search">
                    Clear filters
                  </Link>
                </EmptyState>
              )}

              {/* Two per row: the map takes the other half of the viewport. */}
              {hasResults ? <ProductGrid products={products} columns={2} /> : null}

              <PageLinks
                currentPage={pagination.currentPage}
                lastPage={pagination.lastPage}
                basePath="/search"
                params={carriedParams}
              />
            </div>

            <aside className="listing-map" aria-label="Map of search results">
              <ResultsMap products={products} />
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
