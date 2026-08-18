'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  WEEKDAY_INITIALS,
  WEEKDAY_NAMES,
  addDays,
  addMonths,
  buildMonthGrid,
  compareISO,
  daysBetween,
  formatFullDate,
  formatMonthLabel,
  fromISO,
  monthsBetween,
  startOfMonth,
  toISO,
  todayISO,
} from '@/utils/calendarDates';

/**
 * Two-up range calendar: filled ends, a band across the nights between them, and
 * a live preview while the second date is still being chosen.
 *
 * Values are the same `YYYY-MM-DD` strings the rest of the booking flow passes
 * around, so nothing has to convert on the way in or out.
 *
 * Selection follows the usual range-picker rule: the first click opens a new
 * range, the second closes it, and clicking on or before the open start reopens
 * from there instead of producing a backwards range.
 *
 * @param {object} props
 * @param {{from: string, to: string}} props.value
 * @param {(next: {from: string, to: string}) => void} props.onChange
 * @param {number} [props.monthsShown]
 * @param {string} [props.minDate]  Inclusive `YYYY-MM-DD`; defaults to today.
 * @param {string} [props.maxDate]  Inclusive `YYYY-MM-DD`; unbounded when omitted.
 * @param {number} [props.minNights] Fewest nights a range may span.
 * @param {number} [props.maxNights] Most nights a range may span; 0 means no cap.
 * @param {number} [props.nightsStep]
 *   Granularity of the range. `7` on a weekly listing means check-out may only
 *   land a whole number of weeks after check-in. Days part-way through a week
 *   stay live and round **up** to the end of the week they fall in, so clicking
 *   anywhere in the second week books two whole weeks.
 * @param {boolean} [props.singleDate]
 *   One date rather than a span — an hourly listing, whose length comes from its
 *   hour count. A click sets both ends to the same day, so callers keep reading
 *   `{from, to}` and the API still receives both dates.
 * @param {(iso: string) => boolean} [props.isDateUnavailable] Extra per-day veto.
 * @param {string} [props.className]
 */
export default function DateRangeCalendar({
  value,
  onChange,
  monthsShown = 2,
  minDate,
  maxDate = '',
  minNights = 1,
  maxNights = 0,
  nightsStep = 1,
  singleDate = false,
  isDateUnavailable,
  className = '',
}) {
  const labelId = useId();

  // One fixed "today" per mount. Reading the clock during render would let two
  // renders either side of midnight disagree about which day is ringed.
  const [today] = useState(todayISO);
  // `||`, not `??`: an empty `minDate` means "unset" here, and letting `""`
  // through would compare as earlier than every date and disable the floor.
  const floor = minDate || today;

  // Anything unparseable, backwards, or half-filled from the caller collapses to
  // a start-only range rather than rendering as an inverted band.
  const fromDate = fromISO(value?.from ?? '');
  const from = fromDate ? value.from : '';
  const toDate = fromISO(value?.to ?? '');
  const to = from && toDate && compareISO(value.to, from) > 0 ? value.to : '';
  const isSelectingEnd = Boolean(from) && !to;

  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(fromISO(from) ?? fromISO(floor) ?? new Date()),
  );
  const [hoveredISO, setHoveredISO] = useState('');
  const [focusedISO, setFocusedISO] = useState(() => from || floor);

  const containerRef = useRef(null);
  // Set only by keyboard navigation: moving focus on every render would steal it
  // from the page whenever the parent re-renders for an unrelated reason.
  const shouldRestoreFocus = useRef(false);

  /**
   * Blocked by the caller — already booked, or held for maintenance.
   *
   * Kept apart from `isUnavailable` because the two read differently: a day
   * outside the bookable window is merely greyed, while a day someone else holds
   * is struck through. Only this one earns the line.
   */
  const isBlocked = useCallback((iso) => Boolean(isDateUnavailable?.(iso)), [isDateUnavailable]);

  const isUnavailable = useCallback(
    /** Constraints that hold regardless of what is already selected. */
    (iso) => {
      if (compareISO(iso, floor) < 0) return true;
      if (maxDate && compareISO(iso, maxDate) > 0) return true;
      return isBlocked(iso);
    },
    [floor, maxDate, isBlocked],
  );

  /**
   * Whether every night from `startISO` up to `endISO` is free.
   *
   * A range must not *straddle* a blocked day: if the 15th to the 19th are taken,
   * the 14th and the 20th are both free but booking across them would sell nights
   * someone else already holds. Vetoing only the endpoints would allow exactly
   * that, which is the difference between a greyed-out day and a double booking.
   */
  const spanIsClear = useCallback(
    (startISO, endISO) => {
      const start = fromISO(startISO);
      const nights = daysBetween(start, fromISO(endISO));

      // The start itself is checked by the caller; walk the nights after it.
      for (let offset = 1; offset <= nights; offset += 1) {
        if (isBlocked(toISO(addDays(start, offset)))) return false;
      }

      return true;
    },
    [isBlocked],
  );

  /**
   * The end date a click on `iso` actually commits, or `''` if none is legal.
   *
   * On a stepped listing the click is rounded **up** to the end of the unit it
   * lands in: clicking any day of the second week on a weekly listing books two
   * whole weeks. Up rather than down because a part-unit click reads as "at
   * least this long" — rounding down would silently hand back a shorter booking
   * than the one just asked for, and on a listing whose minimum is one unit it
   * would collapse every click to the minimum.
   *
   * Unstepped listings are unaffected: `wanted` is the click itself, so a day
   * short of the minimum stays refused rather than quietly growing.
   *
   * Takes the start as an argument rather than reading `from`, because it is also
   * asked about a start that has not been committed yet — the auto-completed end
   * below has to be checked before the range is handed to `onChange`.
   */
  const snapEnd = useCallback(
    (startISO, iso) => {
      const start = fromISO(startISO);
      const target = fromISO(iso);
      if (!start || !target) return '';

      const nights = daysBetween(start, target);
      if (nights < 0) return '';
      if (nights === 0) return minNights === 0 ? iso : '';

      const step = nightsStep > 1 ? nightsStep : 0;
      const wanted = step ? Math.max(minNights, Math.ceil(nights / step) * step) : nights;

      if (wanted < minNights) return '';
      if (maxNights > 0 && wanted > maxNights) return '';

      const endISO = toISO(addDays(start, wanted));
      // The rounded-up end is a different day from the one clicked, so it has to
      // clear the same checks the click did — it may land past `maxDate`, or on a
      // day someone else holds.
      if (isUnavailable(endISO)) return '';
      if (!spanIsClear(startISO, endISO)) return '';

      return endISO;
    },
    [isUnavailable, minNights, maxNights, nightsStep, spanIsClear],
  );

  /** Whether a range starting at `startISO` may take `iso` as its end. */
  const canEndAt = useCallback(
    (startISO, iso) => Boolean(snapEnd(startISO, iso)),
    [snapEnd],
  );

  const isStepped = nightsStep > 1;

  const isDisabled = useCallback(
    (iso) => {
      if (isUnavailable(iso)) return true;

      if (isSelectingEnd) {
        // Days at or before the open start stay live — they reopen the range.
        if (compareISO(iso, from) <= 0) return false;
        return !canEndAt(from, iso);
      }

      // A closed stepped range auto-filled itself at the minimum, so lengthening
      // it is the only thing left to do past its far end — those days stay live
      // even mid-unit. Days *inside* the range move check-in instead, and days
      // on an unstepped listing always open a new range, so neither is refused.
      if (isStepped && to && compareISO(iso, to) > 0) return !canEndAt(from, iso);

      return false;
    },
    [isUnavailable, isSelectingEnd, isStepped, from, to, canEndAt],
  );

  /**
   * Hovering paints the band a click would commit — the *snapped* end, so a hover
   * mid-week shows the whole week that clicking books rather than a band that
   * jumps outward on release.
   *
   * A closed range previews only past its far end, and only when stepped: every
   * other click there opens a new range, which has no band to preview.
   */
  const hoverTarget =
    from && hoveredISO && compareISO(hoveredISO, from) > 0 && !isDisabled(hoveredISO)
      ? hoveredISO
      : '';
  const previewsExtension = isStepped && Boolean(to) && compareISO(hoverTarget, to) > 0;
  const previewEnd =
    hoverTarget && (!to || previewsExtension) ? snapEnd(from, hoverTarget) : '';
  // Preview wins while it lasts: an extension hover reaches past the committed end.
  const rangeEnd = previewEnd || to;

  const months = useMemo(
    () => Array.from({ length: monthsShown }, (_, offset) => addMonths(viewMonth, offset)),
    [viewMonth, monthsShown],
  );

  const floorMonth = startOfMonth(fromISO(floor) ?? new Date());
  const ceilingDate = fromISO(maxDate);
  const canGoPrev = monthsBetween(floorMonth, viewMonth) > 0;
  // The last visible month must still sit before the ceiling month.
  const canGoNext =
    !ceilingDate || monthsBetween(startOfMonth(ceilingDate), viewMonth) + monthsShown - 1 < 0;

  const shiftMonths = (amount) => {
    setViewMonth((current) => addMonths(current, amount));
    setHoveredISO('');
  };

  /** Pulls `date` into view, scrolling the least distance that reveals it. */
  const revealMonthOf = useCallback(
    (date) => {
      setViewMonth((current) => {
        const offset = monthsBetween(current, date);
        if (offset < 0) return startOfMonth(date);
        if (offset > monthsShown - 1) return addMonths(startOfMonth(date), -(monthsShown - 1));
        return current;
      });
    },
    [monthsShown],
  );

  const select = (iso) => {
    if (isDisabled(iso)) return;

    // One date: both ends land on it, so there is never a half range to close and
    // every click simply moves the booking.
    if (singleDate) {
      onChange({ from: iso, to: iso });
      setHoveredISO('');
      setFocusedISO(iso);
      return;
    }

    const side = isSelectingEnd ? compareISO(iso, from) : null;
    // `minNights: 0` means a single day is a valid range — a one-day hire — so a
    // second click on the open start closes it rather than reopening from there.
    const closesSameDay = side === 0 && minNights === 0;

    if (isSelectingEnd && (side > 0 || closesSameDay)) {
      onChange({ from, to: snapEnd(from, iso) || iso });
    } else if (isStepped && to && compareISO(iso, to) > 0) {
      // Past the far end of a closed range: read as lengthening the booking
      // rather than starting a new one, which is the only way past the auto-filled
      // minimum. Clicks *inside* the range fall through and move check-in.
      const end = snapEnd(from, iso);
      if (end) onChange({ from, to: end });
    } else {
      /**
       * Opening a new range. A stepped listing is only ever booked in whole units,
       * so the shortest valid range *is* the default: picking check-in fills
       * check-out in at the minimum instead of leaving a half range on screen.
       */
      const autoEnd = isStepped ? toISO(addDays(fromISO(iso), minNights)) : '';

      onChange(
        autoEnd && canEndAt(iso, autoEnd) ? { from: iso, to: autoEnd } : { from: iso, to: '' },
      );
    }

    setHoveredISO('');
    setFocusedISO(iso);
  };

  const moveFocus = (date) => {
    const iso = toISO(date);
    if (compareISO(iso, floor) < 0) return;
    if (maxDate && compareISO(iso, maxDate) > 0) return;

    setFocusedISO(iso);
    revealMonthOf(date);
    shouldRestoreFocus.current = true;
  };

  const handleKeyDown = (event, date) => {
    const moves = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      // Sunday-first grid, so the row runs from -getDay() to +(6 - getDay()).
      Home: -date.getDay(),
      End: 6 - date.getDay(),
    };

    if (event.key in moves) {
      event.preventDefault();
      moveFocus(addDays(date, moves[event.key]));
      return;
    }

    if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault();
      const next = new Date(date.getFullYear(), date.getMonth() + (event.key === 'PageUp' ? -1 : 1), 1);
      // Keep the day of month where the target month is long enough for it.
      const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(date.getDate(), lastDay));
      moveFocus(next);
    }
  };

  useEffect(() => {
    if (!shouldRestoreFocus.current) return;
    shouldRestoreFocus.current = false;

    const target = containerRef.current?.querySelector(`[data-iso="${focusedISO}"]`);
    if (target instanceof HTMLElement) target.focus();
  }, [focusedISO, viewMonth]);

  // The roving tabstop must stay reachable: if the selection moved it off-screen,
  // hand it to the first day of the view instead of leaving the grid untabbable.
  const focusedIsVisible = months.some(
    (month) => monthsBetween(month, fromISO(focusedISO) ?? viewMonth) === 0,
  );
  const tabbableISO = focusedIsVisible ? focusedISO : toISO(viewMonth);

  return (
    <div
      // `has-range` gates the band CSS: without it a lone start date would paint
      // a half-width tail pointing at nothing. Never set for a single date, where
      // both ends sit on the same cell and there is no span to join.
      className={`date-range-calendar ${!singleDate && rangeEnd ? 'has-range' : ''} ${className}`
        .replace(/\s+/g, ' ')
        .trim()}
      ref={containerRef}
    >
      <div className="drc-nav">
        <button
          type="button"
          className="drc-nav-btn"
          onClick={() => shiftMonths(-1)}
          disabled={!canGoPrev}
          aria-label="Previous month"
        >
          <i className="icon icon-chevron-left" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="drc-nav-btn"
          onClick={() => shiftMonths(1)}
          disabled={!canGoNext}
          aria-label="Next month"
        >
          <i className="icon icon-chevron-right" aria-hidden="true" />
        </button>
      </div>

      <div className="drc-months" onMouseLeave={() => setHoveredISO('')}>
        {months.map((month) => {
          const monthLabel = formatMonthLabel(month);
          const headingId = `${labelId}-${month.getFullYear()}-${month.getMonth()}`;

          return (
            <section className="drc-month" key={headingId} aria-labelledby={headingId}>
              <h3 className="drc-month-label" id={headingId}>
                {monthLabel}
              </h3>

              <div className="drc-grid" role="grid" aria-labelledby={headingId}>
                <div className="drc-week drc-weekdays" role="row">
                  {WEEKDAY_INITIALS.map((initial, index) => (
                    <div className="drc-weekday" role="columnheader" key={WEEKDAY_NAMES[index]}>
                      <abbr title={WEEKDAY_NAMES[index]}>{initial}</abbr>
                    </div>
                  ))}
                </div>

                {buildMonthGrid(month).map((week, weekIndex) => (
                  <div className="drc-week" role="row" key={`${headingId}-w${weekIndex}`}>
                    {week.map((date, dayIndex) => {
                      if (!date) {
                        return (
                          <div
                            className="drc-cell is-blank"
                            role="gridcell"
                            aria-hidden="true"
                            key={`${headingId}-w${weekIndex}-${dayIndex}`}
                          />
                        );
                      }

                      const iso = toISO(date);
                      const disabled = isDisabled(iso);
                      const isStart = Boolean(from) && iso === from;
                      const isEnd = Boolean(rangeEnd) && iso === rangeEnd;
                      const inRange =
                        Boolean(rangeEnd) &&
                        compareISO(iso, from) > 0 &&
                        compareISO(iso, rangeEnd) < 0;

                      const cellClasses = [
                        'drc-cell',
                        disabled ? 'is-disabled' : '',
                        // Struck through, not merely greyed: this day is taken.
                        isBlocked(iso) ? 'is-blocked' : '',
                        isStart ? 'is-start' : '',
                        isEnd ? 'is-end' : '',
                        inRange ? 'in-range' : '',
                        // Only the part a click would *add* reads as provisional:
                        // an extension hover leaves the committed week solid.
                        previewEnd && (inRange || isEnd) && compareISO(iso, to || from) > 0
                          ? 'is-preview'
                          : '',
                        iso === today ? 'is-today' : '',
                      ]
                        .filter(Boolean)
                        .join(' ');

                      return (
                        <div
                          className={cellClasses}
                          role="gridcell"
                          // Selection is a property of the cell, not of the
                          // button — `aria-selected` has no meaning on `button`.
                          aria-selected={isStart || isEnd}
                          key={iso}
                        >
                          <button
                            type="button"
                            className="drc-day"
                            data-iso={iso}
                            // `aria-disabled` rather than `disabled`: unavailable
                            // days must still take arrow-key focus, or keyboard
                            // users cannot cross a blocked stretch of the month.
                            aria-disabled={disabled}
                            aria-label={formatFullDate(date)}
                            tabIndex={iso === tabbableISO ? 0 : -1}
                            onClick={() => select(iso)}
                            onFocus={() => setFocusedISO(iso)}
                            onMouseEnter={() => setHoveredISO(iso)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                select(iso);
                                return;
                              }
                              handleKeyDown(event, date);
                            }}
                          >
                            {date.getDate()}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <p className="drc-status" role="status">
        {singleDate
          ? from
            ? `${formatFullDate(fromISO(from))} selected.`
            : 'Choose a date.'
          : from && to
            ? `${formatFullDate(fromISO(from))} to ${formatFullDate(fromISO(to))} selected.`
            : from
              ? `${formatFullDate(fromISO(from))} selected. Choose an end date.`
              : 'Choose a start date.'}
      </p>
    </div>
  );
}
