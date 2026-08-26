'use client';

const STARS = [1, 2, 3, 4, 5];

/**
 * A 1-5 star row — an input, or a score read back.
 *
 * Interactive stars are real `<button>`s rather than icons with a handler on the
 * parent: each star is a target the visitor aims at, so each needs its own hit
 * area, focus ring and label. `aria-label` says the number, since the shape alone
 * tells a screen reader nothing.
 *
 * `readOnly` renders spans instead, and the row states its score in text. Disabled
 * buttons would be the shorter change and the wrong one: five focus stops that
 * refuse every keypress is a worse way to say "this is a result, not a question".
 *
 * @param {object} props
 * @param {number} props.value      0 for unrated. Fractions round to the nearest star.
 * @param {(next: number) => void} [props.onChange]  Required unless `readOnly`.
 * @param {string} props.label      Names the group for assistive tech.
 * @param {boolean} [props.disabled] Interactive rows only — a submit in flight.
 * @param {boolean} [props.readOnly]
 */
export default function StarRating({
  value,
  onChange,
  label,
  disabled = false,
  readOnly = false,
}) {
  // `3.67` fills four: the row is a summary, and there is no half-star glyph.
  const filled = Math.round(value);

  if (readOnly) {
    return (
      <span className="star-rating" role="img" aria-label={`${label}: ${value} out of 5`}>
        {STARS.map((star) => (
          <span
            key={star}
            className={`star-rating-star ${star <= filled ? 'is-on' : ''}`.trim()}
            aria-hidden="true"
          >
            <i className="icon icon-star" />
          </span>
        ))}
      </span>
    );
  }

  return (
    <div className="star-rating" role="group" aria-label={label}>
      {STARS.map((star) => (
        <button
          key={star}
          type="button"
          className={`star-rating-star ${star <= filled ? 'is-on' : ''}`.trim()}
          onClick={() => onChange(star)}
          disabled={disabled}
          aria-pressed={star <= filled}
          aria-label={`${star} star${star === 1 ? '' : 's'}`}
        >
          <i className="icon icon-star" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
