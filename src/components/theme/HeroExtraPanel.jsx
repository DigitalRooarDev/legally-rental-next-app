'use client';

import { DatePicker } from 'antd';
import dayjs from 'dayjs';

import GuestSelector, { summariseGuests } from '@/components/theme/GuestSelector';
import { useRentalOptions } from '@/context/rentalOptionsContext';
import { FUEL_TYPES, TRANSMISSION_TYPES } from '@/lib/constants';

/**
 * The hero's third field changes with the selected category. Every attribute
 * offered here is a verified `categoryServiceList` filter — nothing is collected
 * that cannot narrow the results.
 *
 *   guests     Property / Halls  -> maximum_guests, child_members, adult_members
 *   vehicle    Vehicle           -> fuel_type, transmission_type, seating_capacity,
 *                                   year_of_manufacture
 *   equipment  Equipment         -> date_of_manufacturing
 *   fashion    Fashion           -> date_of_manufacturing, size
 */

export const EMPTY_EXTRA = Object.freeze({
  guests: { maxGuests: 0, children: 0, adults: 0 },
  fuelType: '',
  transmissionType: '',
  seats: '',
  year: '',
  size: '',
});

/**
 * Every URL param the panel can contribute, per variant.
 *
 * The union is what a filter UI has to clear before writing: switching Vehicle
 * to Fashion must not leave a stale `fuelType` behind, and only the keys listed
 * for the active variant are ever written.
 */
export const EXTRA_PARAM_KEYS = Object.freeze({
  guests: ['adults', 'children', 'maxGuests'],
  vehicle: ['fuelType', 'transmissionType', 'seats', 'year'],
  // Equipment and Fashion both date their stock with `date_of_manufacturing`.
  equipment: ['madeIn'],
  fashion: ['madeIn', 'size'],
});

/** Flat list of every key any variant owns — what a reset has to delete. */
export const ALL_EXTRA_PARAM_KEYS = Object.freeze([
  ...new Set(Object.values(EXTRA_PARAM_KEYS).flat()),
]);

/**
 * Panel value -> URL params, for the active variant only.
 *
 * Shared by the hero and the results-page filter modal so the two cannot drift
 * into writing the same selection under different keys.
 *
 * @returns {Record<string, string>} Only non-empty entries.
 */
export const extraToParams = (variant, value = EMPTY_EXTRA) => {
  const pairs =
    variant === 'guests'
      ? {
          adults: value.guests?.adults,
          children: value.guests?.children,
          maxGuests: value.guests?.maxGuests,
        }
      : variant === 'vehicle'
        ? {
            fuelType: value.fuelType,
            transmissionType: value.transmissionType,
            seats: value.seats,
            year: value.year,
          }
        : variant === 'equipment'
          ? { madeIn: value.year }
          : { madeIn: value.year, size: value.size };

  return Object.fromEntries(
    Object.entries(pairs)
      .filter(([, entry]) => entry !== undefined && entry !== null && entry !== '' && entry !== 0)
      .map(([key, entry]) => [key, String(entry)]),
  );
};

/** The inverse: seeds the panel from whatever the URL already holds. */
export const readExtraFromParams = (params) => {
  const count = (key) => Number.parseInt(params.get(key) ?? '', 10) || 0;

  return {
    guests: {
      adults: count('adults'),
      children: count('children'),
      maxGuests: count('maxGuests'),
    },
    fuelType: params.get('fuelType') ?? '',
    transmissionType: params.get('transmissionType') ?? '',
    seats: params.get('seats') ?? '',
    year: params.get('year') ?? params.get('madeIn') ?? '',
    size: params.get('size') ?? '',
  };
};

/** Collapsed text shown on the closed trigger, per variant. */
export const summariseExtra = (variant, value) => {
  if (variant === 'guests') return summariseGuests(value.guests);
  if (variant === 'equipment') return value.year || '';

  if (variant === 'fashion') {
    return [value.year, value.size && `Size ${value.size}`].filter(Boolean).join(' · ');
  }

  // Not a hook, so this reads the compiled-in lists rather than the live ones.
  // Falling back to the raw value keeps a summary that the API has added an
  // option for readable ("CNG") instead of silently blank.
  const fuel =
    FUEL_TYPES.find((option) => option.value === value.fuelType)?.label || value.fuelType;
  const transmission =
    TRANSMISSION_TYPES.find((option) => option.value === value.transmissionType)?.label ||
    value.transmissionType;

  return [fuel, transmission, value.seats && `${value.seats} seats`, value.year]
    .filter(Boolean)
    .join(' · ');
};

/** The query string carries a bare `YYYY`, so that is what the panel stores. */
const YEAR_FORMAT = 'YYYY';
/** Anything older is a typo, not stock — it only clutters the decade grid. */
const MIN_YEAR = 1900;

/** `''`, junk and an out-of-range year all mean "no year", not "this year". */
const toYear = (value) => {
  const year = Number(value);
  if (!Number.isInteger(year) || year < MIN_YEAR || year > dayjs().year()) return null;
  return dayjs().year(year).startOf('year');
};

/** Only one variant renders at a time, so a fixed id stays unique. */
const YEAR_INPUT_ID = 'hero-year-of-manufacture';

/**
 * Year-only antd picker. Two deliberate choices:
 *
 * - The popup portals to `document.body`, which is fine: SearchForm's
 *   outside-click handler whitelists `.ant-picker-dropdown`, so picking a year
 *   does not dismiss the hero panel underneath it.
 * - The caption is a sibling `<label htmlFor>`, not a wrapper. Wrapping would
 *   re-open the popup on every clear, because the × click bubbles to the label
 *   and the browser re-focuses the input it labels.
 *
 * @param {object} props
 * @param {string} props.value           `YYYY` or `''`.
 * @param {(year: string) => void} props.onChange
 */
function YearField({ value, onChange }) {
  return (
    <div className="hero-field">
      <label htmlFor={YEAR_INPUT_ID}>Year of Manufacture</label>
      <DatePicker
        id={YEAR_INPUT_ID}
        picker="year"
        className="date-field hero-year-field"
        placeholder={YEAR_FORMAT}
        format={YEAR_FORMAT}
        value={toYear(value)}
        onChange={(date) => onChange(date ? date.format(YEAR_FORMAT) : '')}
        // Nothing is manufactured in the future.
        disabledDate={(current) =>
          current && (current.year() > dayjs().year() || current.year() < MIN_YEAR)
        }
        allowClear
        suffixIcon={<i className="icon icon-calendar" aria-hidden="true" />}
      />
    </div>
  );
}

/**
 * @param {object} props
 * @param {'guests'|'vehicle'|'equipment'|'fashion'} props.variant
 * @param {object} props.value
 * @param {(next: object) => void} props.onChange
 */
export default function HeroExtraPanel({ variant, value, onChange }) {
  const { fuelTypes, transmissionTypes } = useRentalOptions();
  const set = (patch) => onChange({ ...value, ...patch });

  if (variant === 'guests') {
    return (
      <div className="hero-detail-panel">
        <div className="hero-panel-title">Guests</div>
        <GuestSelector counts={value.guests} onChange={(guests) => set({ guests })} />
      </div>
    );
  }

  if (variant === 'equipment') {
    return (
      <div className="hero-detail-panel">
        <div className="hero-panel-title">Equipment Details</div>
        <YearField value={value.year} onChange={(year) => set({ year })} />
      </div>
    );
  }

  if (variant === 'fashion') {
    return (
      <div className="hero-detail-panel">
        <div className="hero-panel-title">Fashion Details</div>
        <YearField value={value.year} onChange={(year) => set({ year })} />
        <label className="hero-field">
          <span>Size</span>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. XS, S, M, L, XL"
            value={value.size}
            onChange={(event) => set({ size: event.target.value })}
          />
        </label>
      </div>
    );
  }

  return (
    <div className="hero-detail-panel">
      <div className="hero-panel-title">Vehicle Details</div>

      <label className="hero-field">
        <span>Fuel Type</span>
        <select
          className="form-control form-select"
          value={value.fuelType}
          onChange={(event) => set({ fuelType: event.target.value })}
        >
          <option value="">Any</option>
          {fuelTypes.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="hero-field">
        <span>Transmission Type</span>
        <select
          className="form-control form-select"
          value={value.transmissionType}
          onChange={(event) => set({ transmissionType: event.target.value })}
        >
          <option value="">Any</option>
          {transmissionTypes.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="hero-field-row">
        <label className="hero-field">
          <span>Number of Seats</span>
          <input
            type="number"
            min="0"
            className="form-control"
            placeholder="0"
            value={value.seats}
            onChange={(event) => set({ seats: event.target.value })}
          />
        </label>
        <YearField value={value.year} onChange={(year) => set({ year })} />
      </div>
    </div>
  );
}
