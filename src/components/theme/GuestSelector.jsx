'use client';

/**
 * Guest steppers for the Property / Halls hero.
 *
 * All three rows map to real `categoryServiceList` filters, so every control
 * here changes the result set. `0` means "Any" — the filter is simply omitted.
 */
export const GUEST_ROWS = [
  { key: 'maxGuests', label: 'Maximum Guests'},
  { key: 'adults', label: 'Adults'},
  { key: 'children', label: 'Children'},
];

const MAX_PER_ROW = 16;

export const EMPTY_GUESTS = Object.freeze({ maxGuests: 0, children: 0, adults: 0 });

/** "2 adults · 1 child" — the collapsed summary shown on the trigger. */
export const summariseGuests = (counts = {}) => {
  const parts = [];

  if (counts.adults > 0) parts.push(`${counts.adults} adult${counts.adults === 1 ? '' : 's'}`);
  if (counts.children > 0) parts.push(`${counts.children} child${counts.children === 1 ? '' : 'ren'}`);
  if (counts.maxGuests > 0) parts.push(`up to ${counts.maxGuests}`);

  return parts.join(' · ');
};

/**
 * @param {object} props
 * @param {Record<string, number>} props.counts
 * @param {(counts: Record<string, number>) => void} props.onChange
 */
export default function GuestSelector({ counts, onChange }) {
  const step = (key, delta) =>
    onChange({ ...counts, [key]: Math.min(MAX_PER_ROW, Math.max(0, (counts[key] ?? 0) + delta)) });

  return (
    <div className="guest-panel">
      {GUEST_ROWS.map((row) => {
        const value = counts[row.key] ?? 0;

        return (
          <div className="guest-row" key={row.key}>
            <div>
              <div className="guest-row-label">{row.label}</div>
            </div>

            <div className="guest-stepper">
              <button
                type="button"
                onClick={() => step(row.key, -1)}
                disabled={value <= 0}
                aria-label={`Fewer ${row.label.toLowerCase()}`}
              >
                <i className="icon icon-minus"></i>
              </button>
              {/* 0 reads as "Any" rather than a hard zero, matching the design. */}
              <span aria-live="polite">{value === 0 ? '0' : `${value}`}</span>
              <button
                type="button"
                onClick={() => step(row.key, 1)}
                disabled={value >= MAX_PER_ROW}
                aria-label={`More ${row.label.toLowerCase()}`}
              >
                <i className="icon icon-plus"></i>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
