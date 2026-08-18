'use client';

import { Fragment, forwardRef } from 'react';
import { fromISO } from '@/utils/calendarDates';

const DISPLAY_FORMAT = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** A set date reads back formatted; an empty one shows the caller's prompt. */
export const formatRangeCell = (iso, placeholder) => {
  const date = fromISO(iso);
  return date ? DISPLAY_FORMAT.format(date) : placeholder;
};

/**
 * The two-cell face of a date range — start | end — and nothing else.
 *
 * Split out from `<DateRangeField>` because the two hosts that show this face
 * open completely different things behind it: the filters dialog expands a
 * calendar in flow, the listing card opens the same modal the checkout uses.
 * Only the face is shared, so only the face lives here.
 *
 * @param {object} props
 * @param {{from: string, to: string}} props.value
 * @param {(part: 'start' | 'end') => void} props.onOpen
 * @param {boolean} [props.expanded]   Drives `aria-expanded` on both cells.
 * @param {string} [props.controls]    Id of the element the cells open.
 * @param {[string, string]} [props.labels]      Captions inside each cell.
 * @param {[string, string]} [props.placeholder]
 * @param {import('react').ReactNode} [props.separator]
 * @param {{trigger?: string, label?: string, value?: string}} [props.classNames]
 *   Host classes for the cell parts. The `drf-*` classes carry layout only, so a
 *   host with an existing field style passes it here rather than the stylesheet
 *   restating that style under a `.host .drf-*` selector.
 * @param {string} [props.ariaLabel]
 */
const DateRangeTrigger = forwardRef(function DateRangeTrigger(
  {
    value,
    onOpen,
    expanded = false,
    controls,
    labels,
    placeholder = ['Add date', 'Add date'],
    separator,
    classNames = {},
    ariaLabel = 'Dates',
  },
  // Points at the start cell, so a host closing its panel can restore focus.
  ref,
) {
  const cells = [
    { part: 'start', iso: value.from, index: 0 },
    { part: 'end', iso: value.to, index: 1 },
  ];

  return (
    <div className="drf-control">
      {cells.map(({ part, iso, index }) => (
        // The separator is a sibling of the two cells, not a child of the second
        // one — otherwise it eats from that cell's share and the pair stops
        // being equal halves.
        <Fragment key={part}>
          {index === 1 && separator ? (
            <span className="drf-separator" aria-hidden="true">
              {separator}
            </span>
          ) : null}

          <div className="drf-cell-wrap">
            <button
              type="button"
              ref={index === 0 ? ref : undefined}
              className={`drf-cell ${classNames.trigger ?? ''} ${iso ? 'has-value' : ''}`
                .replace(/\s+/g, ' ')
                .trim()}
              onClick={() => onOpen(part)}
              aria-haspopup="dialog"
              aria-expanded={expanded}
              aria-controls={expanded ? controls : undefined}
              aria-label={labels ? undefined : `${ariaLabel} ${index === 0 ? 'from' : 'to'}`}
            >
              {labels ? (
                <span className={`drf-cell-label ${classNames.label ?? ''}`.trim()}>
                  {labels[index]}
                </span>
              ) : null}
              <span className={`drf-cell-value ${classNames.value ?? ''}`.trim()}>
                {formatRangeCell(iso, placeholder[index])}
              </span>
            </button>
          </div>
        </Fragment>
      ))}
    </div>
  );
});

export default DateRangeTrigger;
