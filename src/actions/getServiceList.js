import { cache } from 'react';
import { fetchAPI } from '@/lib/api';
import { getUserSession } from '@/actions/getUserSession';
import { SERVICE_TYPES } from '@/lib/constants';
import { toPagination, toProductViewModels } from '@/utils/mappers';

/**
 * Search / category listing loader — `POST /categoryServiceList`.
 *
 * Server-only (no `"use server"`) because only the listing page calls it, and
 * `cache()` keeps a duplicate render from firing a second request.
 *
 * Every filter is optional; empty values are dropped so the API applies its own
 * defaults rather than filtering on `""`.
 */

const DEFAULT_PER_PAGE = 20;

/** Only these reach the API, and only when non-empty. */
const FILTER_TO_FIELD = Object.freeze({
  categoryId: 'category_id',
  subCategoryId: 'sub_category_id',
  search: 'search_name',
  /**
   * The destination filter. `search_name` matches a listing's *name*, so it
   * answers "Lagos" with the 110 listings whose title happens to say Lagos;
   * `current_city` matches where the listing actually is (1380, and "Ikeja"
   * narrows to exactly the 78 in Ikeja). The address autocomplete sends the
   * town here — never to `search_name`, which is left for free text.
   */
  currentCity: 'current_city',
  minPrice: 'min_price',
  maxPrice: 'max_price',
  sellerLevel: 'seller_level',
  periodTime: 'period_time',
  rentalType: 'rental_type',
  startDate: 'start_date',
  endDate: 'end_date',
  adults: 'adult_members',
  children: 'child_members',
  guests: 'number_of_guests',
  maxGuests: 'maximum_guests',
  // Category-specific attributes from the hero's third field. All verified to
  // narrow the result set; anything that did not is deliberately absent.
  fuelType: 'fuel_type',
  transmissionType: 'transmission_type',
  /** `FURNISHED` | `SEMI_FURNISHED` | `UNFURNISHED`, from `rental_type_info`. */
  furnishingStatus: 'furnishing_status',
  seats: 'seating_capacity',
  year: 'year_of_manufacture',
  /** Equipment and fashion date their stock with `date_of_manufacturing`. */
  madeIn: 'date_of_manufacturing',
  size: 'size',
  latitude: 'l_latitude',
  longitude: 'l_longitude',
  distance: 'distance',
});

const buildBody = (filters, userId, page) => {
  const body = {
    type: SERVICE_TYPES.RENTAL,
    user_id: userId ?? '',
    newApp: true,
    page: String(page),
  };

  Object.entries(FILTER_TO_FIELD).forEach(([key, field]) => {
    const value = filters[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      body[field] = String(value).trim();
    }
  });

  return body;
};

const loadServiceList = cache(async (serialisedFilters, userId, token, page) => {
  const filters = JSON.parse(serialisedFilters);

  const data = await fetchAPI('categoryServiceList', {
    method: 'POST',
    body: buildBody(filters, userId, page),
    token,
  });

  if (!data?.status) {
    // "Service list found" vs. a genuine failure — either way the page renders.
    return {
      products: [],
      pagination: toPagination(null, DEFAULT_PER_PAGE),
      message: data?.message ?? '',
      error: null,
    };
  }

  const response = data.response ?? {};

  return {
    products: toProductViewModels(response.serviceList),
    pagination: toPagination(response.pagination, DEFAULT_PER_PAGE),
    message: data.message ?? '',
    error: null,
  };
});

/**
 * @param {object} [options]
 * @param {object} [options.filters] Any subset of `FILTER_TO_FIELD`'s keys.
 * @param {number} [options.page=1]
 * @returns {Promise<{products: object[], pagination: object, message: string, error: string|null}>}
 */
export const getServiceList = async ({ filters = {}, page = 1 } = {}) => {
  const { userId, token } = await getUserSession();

  try {
    // `cache()` keys on argument identity, so filters go in as a stable string.
    return await loadServiceList(JSON.stringify(filters), userId ?? '', token, page);
  } catch (error) {
    console.error('SERVICE LIST failed', error);
    return {
      products: [],
      pagination: toPagination(null, DEFAULT_PER_PAGE),
      message: '',
      error: 'Unable to load listings right now.',
    };
  }
};
