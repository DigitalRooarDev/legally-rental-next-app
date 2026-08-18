'use client';

/** Infants do not count toward the guest cap, so they carry their own. */
const MAX_INFANTS = 5;
const MAX_PETS = 5;

const ROWS = [
  { key: 'adults', label: 'Adults', hint: 'Age 13+' },
  { key: 'children', label: 'Children', hint: 'Ages 2–12' },
  { key: 'infants', label: 'Infants', hint: 'Under 2' },
  { key: 'pets', label: 'Pets', hint: '' },
];

/** "This place has a maximum of 3 guests, not including infants. Pets aren't allowed." */
export const partyNote = (maxGuests, petsAllowed) =>
  [
    maxGuests > 0
      ? `This place has a maximum of ${maxGuests} guest${
          maxGuests === 1 ? '' : 's'
        }, not including infants.`
      : '',
    petsAllowed ? '' : "Pets aren't allowed.",
  ]
    .filter(Boolean)
    .join(' ');

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
