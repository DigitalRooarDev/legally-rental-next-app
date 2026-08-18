'use client';

/** A booking priced by the hour still has to be at least one. */
export const MIN_HOURS = 1;
/** Past a full day the listing is being booked by the day, not the hour. */
export const MAX_HOURS = 24;

export const clampHours = (value) =>
  Math.min(MAX_HOURS, Math.max(MIN_HOURS, Number.parseInt(value, 10) || MIN_HOURS));

/**
 * The minus / count / plus control on its own, without a label.
 *
 * Split out because it is needed in two places that word the row differently: the
 * listing card pairs it with its own label below, and the checkout summary puts it
 * in the slot where every other row keeps its Edit link. Sharing the control keeps
 * the clamping, the disabled ends and the `.guest-stepper` styling in one place —
 * a second copy in the summary would be the same markup free to drift.
 *
 * @param {object} props
 * @param {number} props.value
 * @param {(next: number) => void} props.onChange
 */
export function HoursStepper({ value, onChange }) {
  const hours = clampHours(value);

  const step = (delta) => {
    const next = clampHours(hours + delta);
    if (next !== hours) onChange(next);
  };

  return (
    <div className="guest-stepper">
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={hours <= MIN_HOURS}
        aria-label="Fewer hours"
      >
        <i className="icon icon-minus" aria-hidden="true" />
      </button>
      <span aria-live="polite">{hours}</span>
      <button
        type="button"
        onClick={() => step(1)}
        disabled={hours >= MAX_HOURS}
        aria-label="More hours"
      >
        <i className="icon icon-plus" aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * How many hours, for a listing whose `period_type` is hourly.
 *
 * A stepper rather than a typed field so it matches the guest rows directly
 * below it, and because the range is small enough that typing is no faster.
 *
 * Rendered in place rather than behind a popup: unlike dates and guests there is
 * only one value to set, so a dialog would be two clicks for one number.
 *
 * @param {object} props
 * @param {number} props.value
 * @param {(next: number) => void} props.onChange
 */
export default function BookingHoursPicker({ value, onChange }) {
  const hours = clampHours(value);

  return (
    <div className="booking-hours">
      <div>
        <span className="booking-field-label">Hours</span>
        <span className="booking-field-value">
          {hours} hour{hours === 1 ? '' : 's'}
        </span>
      </div>

      <HoursStepper value={hours} onChange={onChange} />
    </div>
  );
}
