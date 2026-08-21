'use client';

import { CURRENCY_SYMBOL } from '@/lib/constants';

/** Infants do not count toward the guest cap, so they carry their own. */
const MAX_INFANTS = 5;
const MAX_PETS = 5;

const ROWS = [
  { key: 'adults', label: 'Adults', hint: 'Age 13+' },
  { key: 'children', label: 'Children', hint: 'Ages 2–12' },
  { key: 'infants', label: 'Infants', hint: 'Under 2' },
  { key: 'pets', label: 'Pets', hint: '' },
];

const plural = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`;

/**
 * 3000 -> "₦3,000"; 2500.5 -> "₦2,500.50".
 *
 * Kobo only when there are kobo — a whole-naira fee reads as a price, not a
 * calculation, and `.5` on its own reads as a typo.
 */
const fee = (amount) =>
  `${CURRENCY_SYMBOL}${Number(amount).toLocaleString('en-NG', {
    minimumFractionDigits: Number.isInteger(Number(amount)) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

/**
 * The sentences under the steppers, in reading order.
 *
 * Object argument rather than four positionals: the two counts and the fee are all
 * numbers, and a transposed pair would print a plausible-looking but wrong cap.
 *
 * "This place includes 2 guests, up to a maximum of 10, not including infants.
 *  Each extra guest is ₦3,000 per night. Pets aren't allowed."
 *
 * The included count is only worth a sentence when it is *below* the cap — when
 * the two are equal there is no extra guest to charge for, so the note falls back
 * to the cap alone rather than saying the same number twice.
 *
 * @param {object} rules
 * @param {number} rules.maxGuests        0 when the listing sets no cap.
 * @param {boolean} rules.petsAllowed
 * @param {number} [rules.includedGuests] Guests the nightly rate already covers.
 * @param {number} [rules.extraGuestFee]  Per extra guest, per night.
 */
export const partyNote = ({ maxGuests, petsAllowed, includedGuests = 0, extraGuestFee = 0 }) => {
  const hasIncluded = includedGuests > 0 && (maxGuests <= 0 || includedGuests < maxGuests);

  const cap = () => {
    if (maxGuests <= 0) {
      return hasIncluded ? `This place includes ${plural(includedGuests, 'guest')}.` : '';
    }

    return hasIncluded
      ? `This place includes ${plural(includedGuests, 'guest')}, up to a maximum of ${maxGuests}, not including infants.`
      : `This place has a maximum of ${plural(maxGuests, 'guest')}, not including infants.`;
  };

  return [
    cap(),
    // Only meaningful once there is a guest the rate does not already cover.
    hasIncluded && extraGuestFee > 0 ? `Each extra guest is ${fee(extraGuestFee)} per night.` : '',
    petsAllowed ? '' : "Pets aren't allowed.",
  ]
    .filter(Boolean)
    .join(' ');
};

/**
 * The four stepper rows, on their own.
 *
 * Shared by the listing page's dropdown and the checkout's "Change guests"
 * dialog: the caps are the booking's rules, not one surface's, and duplicating
 * them is how the two would come to disagree about whether a fifth guest fits.
 *
 * @param {object} props
 * @param {{adults: number, children: number, infants: number, pets: number}} props.value
 * @param {(next: object) => void} props.onChange
 * @param {number} props.maxGuests    0 when the listing sets no cap.
 * @param {boolean} props.petsAllowed
 */
export default function GuestRows({ value, onChange, maxGuests, petsAllowed }) {
  // Infants are excluded by design — the cap counts adults and children only.
  const guestCount = (value.adults ?? 0) + (value.children ?? 0);
  const atCap = maxGuests > 0 && guestCount >= maxGuests;

  const limits = {
    // Never below one adult: the other rows cannot make up a party on their own.
    adults: { min: 1, max: maxGuests > 0 ? maxGuests : 16 },
    children: { min: 0, max: maxGuests > 0 ? maxGuests - 1 : 16 },
    infants: { min: 0, max: MAX_INFANTS },
    pets: { min: 0, max: petsAllowed ? MAX_PETS : 0 },
  };

  const step = (key, delta) => {
    const { min, max } = limits[key];

    // Adults and children share the cap, so an increment that would breach it is
    // refused here rather than corrected after the fact.
    if (delta > 0 && (key === 'adults' || key === 'children') && atCap) return;

    onChange({ ...value, [key]: Math.min(max, Math.max(min, (value[key] ?? 0) + delta)) });
  };

  return ROWS.map((row) => {
    const count = value[row.key] ?? 0;
    const { min, max } = limits[row.key];
    const canAdd = count < max && !(atCap && (row.key === 'adults' || row.key === 'children'));

    return (
      <div className="guest-row" key={row.key}>
        <div>
          <div className="guest-row-label">{row.label}</div>
          {row.key !== 'pets' && <div className="guest-row-hint">{row.hint}</div>}
        </div>

        <div className="guest-stepper">
          <button
            type="button"
            onClick={() => step(row.key, -1)}
            disabled={count <= min}
            aria-label={`Fewer ${row.label.toLowerCase()}`}
          >
            <i className="icon icon-minus" aria-hidden="true" />
          </button>
          <span aria-live="polite">{count}</span>
          <button
            type="button"
            onClick={() => step(row.key, 1)}
            disabled={!canAdd}
            aria-label={`More ${row.label.toLowerCase()}`}
          >
            <i className="icon icon-plus" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  });
}
