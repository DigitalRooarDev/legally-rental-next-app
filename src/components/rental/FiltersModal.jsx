'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Slider } from 'antd';
import DateRangeField from '@/components/theme/DateRangeField';
import HeroExtraPanel, {
  ALL_EXTRA_PARAM_KEYS,
  EMPTY_EXTRA,
  extraToParams,
  readExtraFromParams,
} from '@/components/theme/HeroExtraPanel';
import PlaceSearchField from '@/components/theme/PlaceSearchField';
import { useRentalOptions } from '@/context/rentalOptionsContext';
import { usePlaceSuggestions } from '@/hooks/usePlaceSuggestions';
import { categoryParam, findCategory } from '@/lib/categories';
import {
  AMENITY_RENTAL_TYPES,
  CURRENCY_SYMBOL,
  HERO_EXTRA_BY_RENTAL_TYPE,
} from '@/lib/constants';

/**
 * Upper bound of the price slider. The API has no "dearest listing" endpoint, so
 * this is a display ceiling only — a slider parked at the top writes no
 * `maxPrice` at all rather than capping the query at this number.
 */
const PRICE_CEILING = 10_000_000;
const PRICE_STEP = 5_000;
/** How long typing has to pause before an inverted min/max is corrected. */
const PRICE_CHECK_DELAY = 700;

/** Every param this modal owns. Anything else (map bounds) survives Apply. */
const OWNED_PARAMS = Object.freeze([
  'city',
  'address',
  'category',
  'subcategory',
  'startDate',
  'endDate',
  'minPrice',
  'maxPrice',
  'furnishing',
  'airCondition',
  ...ALL_EXTRA_PARAM_KEYS,
]);


console.log(OWNED_PARAMS);

const EMPTY_DRAFT = Object.freeze({
  location: '',
  place: '',
  category: '',
  subcategory: '',
  startDate: '',
  endDate: '',
  price: [0, PRICE_CEILING],
  furnishing: '',
  airCondition: false,
  extra: EMPTY_EXTRA,
});

const formatPrice = (value) =>
  value >= 1_000_000
    ? `${CURRENCY_SYMBOL}${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`
    : `${CURRENCY_SYMBOL}${value.toLocaleString('en-NG')}`;

/** `''` -> the slider's own bound, so an unset filter shows as the full range. */
const toPriceRange = (min, max) => [
  Math.min(Math.max(Number.parseInt(min, 10) || 0, 0), PRICE_CEILING),
  Math.min(Number.parseInt(max, 10) || PRICE_CEILING, PRICE_CEILING),
];

const clampPrice = (value) => Math.min(Math.max(Number(value) || 0, 0), PRICE_CEILING);

/** An emptied field means "no bound": 0 for the minimum, the ceiling for the maximum. */
const parsePrice = (text, fallback) => (String(text).trim() === '' ? fallback : clampPrice(text));

/** Puts the lower value first, so a range typed "backwards" still makes sense. */
const sortPriceRange = ([a, b]) => (a <= b ? [a, b] : [b, a]);

/**
 * Reads the applied filters out of the URL into the modal's draft shape.
 *
 * The draft is deliberately a copy: nothing the user touches reaches the URL
 * until Apply, so closing the modal discards the edit and the results behind it
 * never flicker mid-adjustment.
 */
const readDraft = (searchParams, categories) => {
  const category = findCategory(categories, searchParams.get('category'));

  return {
    // `location` is what the user sees, `place` is the town actually sent to the
    // API. They differ once a suggestion is picked ("52a Kofo Abayomi St,
    // Victoria Island, Lagos" vs "Lagos"), so the URL carries both — `address`
    // to display, `city` to filter.
    location: searchParams.get('address') ?? searchParams.get('city') ?? '',
    place: searchParams.get('city') ?? '',
    category: category ? categoryParam(category) : '',
    subcategory: searchParams.get('subcategory') ?? '',
    startDate: searchParams.get('startDate') ?? '',
    endDate: searchParams.get('endDate') ?? '',
    price: toPriceRange(searchParams.get('minPrice'), searchParams.get('maxPrice')),
    furnishing: searchParams.get('furnishing') ?? '',
    airCondition: searchParams.get('airCondition') === '1',
    extra: readExtraFromParams(searchParams),
  };
};

/**
 * How many filter *groups* are applied — what the Filter button's badge shows.
 *
 * Counted by group rather than by param so a date range reads as one filter, not
 * two, and a vehicle's four attributes do not inflate the badge.
 *
 * @param {URLSearchParams} searchParams
 */
export const countActiveFilters = (searchParams) => {
  const has = (key) => Boolean(searchParams.get(key));
  
  return [
    has('city'),
    has('category'),
    has('subcategory'),
    has('startDate') || has('endDate'),
    has('minPrice') || has('maxPrice'),
    has('furnishing'),
    has('airCondition'),
    ALL_EXTRA_PARAM_KEYS.some(has),
  ].filter(Boolean).length;
};

/**
 * The modal's body, and the sole owner of the draft.
 *
 * Split out so it can be mounted only while the modal is open: remounting is
 * what re-seeds the draft from the URL, which an effect would otherwise have to
 * do by writing state on every open.
 */
function FiltersForm({ categories, searchParams, onApply }) {
  const { furnishingStatuses } = useRentalOptions();
  const [draft, setDraft] = useState(() => readDraft(searchParams, categories));

  const set = (patch) => setDraft((current) => ({ ...current, ...patch }));

  
  // The same debounced lookup the hero's Where field uses.
  const {
    suggestions: places,
    suppress: suppressPlaceQuery,
    clear: clearPlaces,
  } = usePlaceSuggestions(draft.location, draft.location);

  const draftCategory = useMemo(
    () => findCategory(categories, draft.category),
    [categories, draft.category],
  );

  const subCategories = draftCategory?.subcategories ?? [];
  const extraVariant = HERO_EXTRA_BY_RENTAL_TYPE[draftCategory?.rentalType] ?? 'guests';
  const showAmenities = AMENITY_RENTAL_TYPES.includes(draftCategory?.rentalType);

  const [minPrice, maxPrice] = draft.price;

  // What the two inputs show, kept apart from `draft.price` so a field can be
  // emptied or half-typed without being forced back to a number on every key.
  const [priceInput, setPriceInput] = useState(() => draft.price.map(String));
  const lastEditedPrice = useRef('max');

  const setPriceField = (index, text) => {
    lastEditedPrice.current = index === 0 ? 'min' : 'max';
    const nextInput = index === 0 ? [text, priceInput[1]] : [priceInput[0], text];
    setPriceInput(nextInput);
    set({ price: [parsePrice(nextInput[0], 0), parsePrice(nextInput[1], PRICE_CEILING)] });
  };

  // Once typing pauses, an inverted range is corrected by moving the field the
  // user just edited up/down to the other one — never mid-number.
  useEffect(() => {
    if (minPrice <= maxPrice) return undefined;

    const timer = setTimeout(() => {
      const fixed = lastEditedPrice.current === 'max' ? [minPrice, minPrice] : [maxPrice, maxPrice];
      setPriceInput(fixed.map(String));
      setDraft((current) => ({ ...current, price: fixed }));
    }, PRICE_CHECK_DELAY);

    return () => clearTimeout(timer);
  }, [minPrice, maxPrice]);

  const buildParams = (next) => {
    const params = new URLSearchParams(searchParams.toString());

    // Cleared wholesale first: a param the new selection does not set — last
    // round's sub-category, a vehicle's `fuelType` after switching to Fashion —
    // has to leave the URL, not linger and keep filtering.
    OWNED_PARAMS.forEach((key) => params.delete(key));
    // Any filter change invalidates the current page number.
    params.delete('page');

    if (!next) return params;

    // See the hero: `city` is the half that filters, `address` only displays.
    const address = next.location.trim();
    const city = (next.place || next.location).trim();

    if (city) params.set('city', city);
    if (address && address !== city) params.set('address', address);

    if (next.category) params.set('category', next.category);
    if (next.subcategory) params.set('subcategory', next.subcategory);
    if (next.startDate) params.set('startDate', next.startDate);
    if (next.endDate) params.set('endDate', next.endDate);

    const [min, max] = sortPriceRange(next.price);
    // Untouched range -> no price filter at all. Once either end moves, both are
    // sent: the API only applies the price filter when it gets the pair, so a
    // lone max goes out with a min of 0 and a lone min with the ceiling as max.
    if (min > 0 || max < PRICE_CEILING) {
      params.set('minPrice', String(min));
      params.set('maxPrice', String(max));
    }

    // Only where the panel offers it — switching to Vehicle must not leave a
    // furnishing status behind, the same rule the attribute params follow.
    if (next.furnishing && extraVariant === 'guests') params.set('furnishing', next.furnishing);

    // Same rule for amenities: Vehicle and Property only. Unchecked writes
    // nothing — the search page sends the API `0` for it.
    if (next.airCondition && showAmenities) params.set('airCondition', '1');

    Object.entries(extraToParams(extraVariant, next.extra)).forEach(([key, value]) => {
      params.set(key, value);
    });
    return params;
  };

  return (
    <>
      <div className="filters-modal-body">
        <section className="filters-section">
          <h3 className="filters-section-title">Search Location</h3>
          <PlaceSearchField
            id="filters-location"
            variant="plain"
            label=""
            value={draft.location}
            suggestions={places}
            onChange={(text) =>
              // Typing invalidates the town from the last pick: the text and the
              // place sent to the API must never describe different spots.
              set({ location: text, place: '' })
            }
            onClear={() => {
              set({ location: '', place: '' });
              clearPlaces();
            }}
            onSelect={(suggestion) => {
              suppressPlaceQuery(suggestion.label);
              set({
                location: suggestion.label,
                place: suggestion.place || suggestion.label,
              });
              clearPlaces();
            }}
          />
        </section>

        <section className="filters-section filters-section-main-category">
          <h3 className="filters-section-title">Rental Category</h3>
          <div className="filters-pills">
            {categories.map((category) => {
              const token = categoryParam(category);

              return (
                <button
                  key={category.id}
                  type="button"
                  className={`filters-pill filters-pill--icon ${draft.category === token ? 'active' : ''}`}
                  // Changing category invalidates the sub-category under it, and
                  // re-renders the attribute block for the new rental type.
                  onClick={() =>
                    set({ category: draft.category === token ? '' : token, subcategory: '' })
                  }
                >
                  {category.icon ? (
                    /* eslint-disable-next-line @next/next/no-img-element -- remote category icons vary in size; no optimisation needed at 22px */
                    <img src={category.icon} alt="" width={22} height={22} />
                  ) : null}
                  {category.name}
                </button>
              );
            })}
          </div>
        </section>

        <section className="filters-section">
          <h3 className="filters-section-title">Subcategory</h3>
          {subCategories.length === 0 ? (
            <p className="filter-panel-empty">
              {draftCategory
                ? 'This category has no sub-categories.'
                : 'Pick a rental category first.'}
            </p>
          ) : (
            <div className="filters-pills">
              {subCategories.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  className={`filters-pill ${draft.subcategory === String(sub.id) ? 'active' : ''}`}
                  onClick={() =>
                    set({
                      subcategory: draft.subcategory === String(sub.id) ? '' : String(sub.id),
                    })
                  }
                >
                  {sub.name}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="filters-section">
          <h3 className="filters-section-title">Duration</h3>
          <div className="filters-duration">
            {/* One range field, not two date inputs: the second month has to
                know the first pick to grey out everything before it, and a
                linked two-month view is how a stay is actually chosen. The two
                boxes are the field's own cells, captioned in place.

                Expanded in flow rather than floated — the dialog body scrolls,
                and a positioned panel would be clipped by its `overflow`. */}
            <DateRangeField
              className="filters-range"
              value={{ from: draft.startDate, to: draft.endDate }}
              onChange={({ from, to }) => set({ startDate: from, endDate: to })}
              labels={['From', 'Until']}
              placeholder={['Add Dates', 'Add Dates']}
              // Filtering listings, not booking one — a single day is a valid
              // hire, so the range may start and end on the same date.
              minNights={0}
              separator={<i className="icon icon-arrow-right" aria-hidden="true" />}
              ariaLabel="Duration"
            />
          </div>
          
        </section>

        <section className="filters-section">
          <div className="filters-section-head">
            <h3 className="filters-section-title">Price Range</h3>
            <span className="filters-price-badge">
              {/* The slider's full span, not the selection — the inputs below
                  already show what is picked. */}
              {formatPrice(0)} – {formatPrice(PRICE_CEILING)}
            </span>
          </div>

          <Slider
            range
            min={0}
            max={PRICE_CEILING}
            step={PRICE_STEP}
            value={draft.price}
            onChange={(price) => {
              set({ price });
              setPriceInput(price.map(String));
            }}
            tooltip={{ formatter: formatPrice }}
            className="filters-price-slider"
          />

          <div className="filters-price-inputs">
            <label>
              <span>Minimum</span>
              <input
                type="number"
                min="0"
                max={PRICE_CEILING}
                className="form-control"
                value={priceInput[0]}
                placeholder="0"
                onChange={(event) => setPriceField(0, event.target.value)}
              />
            </label>
            <label>
              <span>Maximum</span>
              <input
                type="number"
                min="0"
                max={PRICE_CEILING}
                className="form-control"
                value={priceInput[1]}
                placeholder="No limit"
                onChange={(event) => setPriceField(1, event.target.value)}
              />
            </label>
          </div>
        </section>

        {/* Property and Halls only — the rental types a furnishing status means
            anything for, which is exactly where the panel below shows Guests. */}
        {extraVariant === 'guests' ? (
          <section className="filters-section">
            <h3 className="filters-section-title">Furnishing Status</h3>
            <select
              className="form-control form-select filters-select"
              value={draft.furnishing}
              onChange={(event) => set({ furnishing: event.target.value })}
              aria-label="Furnishing Status"
            >
              <option value="">Any type</option>
              {furnishingStatuses.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </section>
        ) : null}

        {showAmenities ? (
          <section className="filters-section filters-amenities">
            <h3 className="filters-section-title">Amenities</h3>
            <div className="filters-pills">
              <button
                type="button"
                className={`filters-pill filters-pill--icon ${draft.airCondition ? 'active' : ''}`}
                aria-pressed={draft.airCondition}
                onClick={() => set({ airCondition: !draft.airCondition })}
              >
                <i className="icon icon-air-conditioning" aria-hidden="true" />
                Air conditioning
              </button>
            </div>
          </section>
        ) : null}

        {/* The same panel the hero's third field renders, so the attributes on
            offer here and there can never disagree. */}
        <section className="filters-section filters-section--extra">
          <HeroExtraPanel
            variant={extraVariant}
            value={draft.extra}
            onChange={(extra) => set({ extra })}
          />
        </section>
      </div>

      <div className="filters-modal-footer">
        <button
          type="button"
          className="filter-clear-all"
          onClick={() => {
            setDraft(EMPTY_DRAFT);
            setPriceInput(EMPTY_DRAFT.price.map(String));
            onApply(buildParams(null));
          }}
        >
          Clear All
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onApply(buildParams(draft))}
        >
          APPLY FILTERS
        </button>
      </div>
    </>
  );
}

/**
 * The `/search` filter modal.
 *
 * Sections follow the category being filtered *to*, not the one the results
 * currently show — picking Vehicle swaps the sub-category list and the attribute
 * block immediately with no server round trip, because `categoryList` already
 * nests both.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {Array<object>} props.categories       Full tree, sub-categories included.
 * @param {URLSearchParams} props.searchParams   The applied filters.
 * @param {(params: URLSearchParams) => void} props.onApply
 */
export default function FiltersModal({ open, onClose, categories, searchParams, onApply }) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Filters"
      footer={null}
      centered
      width={640}
      className="filters-modal"
      destroyOnHidden
    >
      {open ? (
        <FiltersForm categories={categories} searchParams={searchParams} onApply={onApply} />
      ) : null}
    </Modal>
  );
}
