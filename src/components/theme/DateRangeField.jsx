'use client';

import { useEffect, useId, useRef, useState } from 'react';
import DateRangeCalendar from '@/components/theme/DateRangeCalendar';
import DateRangeTrigger from '@/components/theme/DateRangeTrigger';

const EMPTY_RANGE = { from: '', to: '' };

/**
 * `<DateRangeTrigger>` with a calendar that expands beneath it, in flow.
 *
 * In flow rather than floating because the one host is the filters dialog, whose
 * body scrolls (`overflow-y: auto`) and would clip anything positioned out of
 * it. A host that wants the calendar in a modal composes `<DateRangeTrigger>`
 * with that modal directly instead — see `<ServiceBookingCard>`.
 *
 * Edits run against a local draft and only reach `onChange` once *both* ends are
 * set. The host writes straight to the URL on every change, and a half range
 * filters nothing, so committing mid-selection would put a meaningless
 * `?startDate=` in the address bar.
 *
 * @param {object} props
 * @param {{from: string, to: string}} props.value
 * @param {(next: {from: string, to: string}) => void} props.onChange
 * @param {[string, string]} [props.labels]       Captions inside each cell.
 * @param {[string, string]} [props.placeholder]
 * @param {import('react').ReactNode} [props.separator]
 * @param {string} [props.className]
 * @param {{trigger?: string, label?: string, value?: string}} [props.classNames]
 * @param {number} [props.monthsShown]
 * @param {number} [props.minNights]
 * @param {number} [props.maxNights]
 * @param {string} [props.ariaLabel]
 */
export default function DateRangeField({
  value,
  onChange,
  labels,
  placeholder = ['Add date', 'Add date'],
  separator,
  className = '',
  classNames = {},
  monthsShown = 2,
  minNights = 1,
  maxNights = 0,
  ariaLabel = 'Dates',
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  const rootRef = useRef(null);
  const triggerRef = useRef(null);

  const close = ({ restoreFocus = false } = {}) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  /** @param {'start' | 'end'} part Which cell was clicked. */
  const openFor = (part) => {
    if (open) {
      close({ restoreFocus: true });
      return;
    }

    // Opening on the end cell of a settled range means "keep the start, move the
    // end" — so seed the draft half-open rather than making the visitor re-pick
    // a date they already chose.
    setDraft(part === 'end' && value.from && value.to ? { from: value.from, to: '' } : value);
    setOpen(true);
  };

  const handleCalendarChange = (next) => {
    setDraft(next);

    // A complete range is the whole point of the panel — commit and get out of
    // the way. Anything short of that stays local until it is finished.
    if (next.from && next.to) {
      onChange(next);
      close();
    }
  };

  const clear = () => {
    setDraft(EMPTY_RANGE);
    onChange(EMPTY_RANGE);
    close({ restoreFocus: true });
  };

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      // Stop the key here: inside a dialog it would otherwise close the dialog
      // as well, losing every other filter the visitor had set.
      event.stopPropagation();
      close({ restoreFocus: true });
    };

    // Capture phase so a click on a control that unmounts itself still counts.
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  return (
    <div className={`date-range-field ${className}`.trim()} ref={rootRef}>
      <DateRangeTrigger
        ref={triggerRef}
        value={value}
        onOpen={openFor}
        expanded={open}
        controls={panelId}
        labels={labels}
        placeholder={placeholder}
        separator={separator}
        classNames={classNames}
        ariaLabel={ariaLabel}
      />

      {open ? (
        <div className="drf-panel" id={panelId} role="dialog" aria-label={ariaLabel}>
          <DateRangeCalendar
            value={draft}
            onChange={handleCalendarChange}
            monthsShown={monthsShown}
            minNights={minNights}
            maxNights={maxNights}
          />

          <div className="drf-panel-actions">
            <button type="button" className="btn-link" onClick={clear}>
              Clear dates
            </button>
            <button
              type="button"
              className="btn-link"
              onClick={() => close({ restoreFocus: true })}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
