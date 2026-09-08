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
 * @param {number} props.value      0 for unrated. A fraction fills part of a star when
 *   `readOnly`, and rounds to the nearest whole one on an input — there is no
 *   half-star to click.
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
  if (readOnly) {
    /**
     * A read-back is a result, so `4.3` shows as four stars and a third of a
     * fifth rather than rounding to four — the number beside it says 4.30, and
     * a row that disagrees with its own figure reads as a bug.
     */
    const whole = Math.floor(value);
    const remainder = Math.round((value - whole) * 100);

    return (
      <span className="star-rating" role="img" aria-label={`${label}: ${value} out of ${STARS.length}`}>
        {STARS.map((star) => {
          const isOn = star <= whole;
          const partial = !isOn && star === whole + 1 ? remainder : 0;

          return (
            <span
              key={star}
              className={`star-rating-star ${isOn ? 'is-on' : ''}`.trim()}
              aria-hidden="true"
            >
              <i className="icon icon-star" />
              {/* The lit copy, clipped to the fraction earned. Clipping a wrapper
                  rather than narrowing the icon keeps the mask at full size, so
                  the visible slice is a slice of a star and not a squashed one. */}
              {partial > 0 ? (
                <span className="star-rating-star-part" style={{ width: `${partial}%` }}>
                  <i className="icon icon-star" />
                </span>
              ) : null}
            </span>
          );
        })}
      </span>
    );
  }

  // No half-star to aim at on an input: `3.67` presents as four selected.
  const filled = Math.round(value);

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
