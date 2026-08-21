'use client';

import { useMemo, useState } from 'react';
import { Modal } from 'antd';
import GuestRows, { partyNote } from '@/components/rental/GuestRows';
import DateRangeCalendar from '@/components/theme/DateRangeCalendar';
import { formatLengthWindow } from '@/lib/bookingLength';

/**
 * The date calendar, in a dialog.
 *
 * Shared by the listing card and the checkout, so both places pick dates through
 * exactly the same control — the listing on a first choice, the checkout on a
 * change. The draft is local and only reaches the caller on Save, so cancelling
 * leaves the booking (and its price) exactly as it was. The calendar *is* the
 * dialog body: no field, no second popup to open.
 *
 * The hour count is *not* here: an hourly listing gets its own row in the checkout
 * summary, with the stepper in it. See `<CheckoutSummary>`.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {{from: string, to: string}} props.value
 * @param {(next: {from: string, to: string}) => void} props.onSave
 * @param {() => void} props.onClose
 * @param {import('@/lib/bookingLength').BookingLength} props.length
 *   From `resolveBookingLength(service)` — one object rather than loose
 *   min/max/step props, so the listing card and the checkout cannot hand this
 *   dialog two different sets of rules for the same listing.
 * @param {string[]} [props.unavailableDates]
 *   `YYYY-MM-DD` days already booked or held for maintenance. Struck through, and
 *   a range may neither land on nor span one.
 * @param {string} [props.title]
 */
export function ChangeDatesModal({
  open,
  value,
  onSave,
  onClose,
  length,
  unavailableDates,
  title = 'Change dates',
}) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={title}
      footer={null}
      centered
      width={720}
      className="checkout-edit-modal"
      destroyOnHidden
    >
      {/* Mounted only while open, which is what re-seeds the draft from the
          booking — an effect would have to write state on every opening. */}
      {open ? (
        <DatesForm
          value={value}
          onSave={onSave}
          length={length}
          unavailableDates={unavailableDates}
        />
      ) : null}
    </Modal>
  );
}

function DatesForm({ value, onSave, length, unavailableDates }) {
  const [draft, setDraft] = useState(value);

  /**
   * A `Set` so the calendar's per-day question is O(1): it asks once per rendered
   * cell and again for every night of a candidate range, which a linear scan over
   * a long booking list would turn into real work.
   */
  const isDateUnavailable = useMemo(() => {
    const blocked = new Set(unavailableDates ?? []);
    return blocked.size > 0 ? (iso) => blocked.has(iso) : undefined;
  }, [unavailableDates]);

  // "" for an hourly listing, whose length is an hour count rather than a span.
  const lengthWindow = formatLengthWindow(length);

  return (
    <>
      {/* Above the calendar it constrains: the greying-out below is the rule
          being enforced, and this is the rule being stated. */}

      <DateRangeCalendar
        value={draft}
        onChange={setDraft}
        minNights={length.minNights}
        maxNights={length.maxNights}
        nightsStep={length.nightsStep}
        singleDate={length.singleDate}
        isDateUnavailable={isDateUnavailable}
        className="checkout-dates-calendar"
      />

      {lengthWindow ? <p className="checkout-edit-note">{lengthWindow}</p> : null}

      <div className="checkout-edit-actions">
        <button type="button" className="btn-link" onClick={() => setDraft({ from: '', to: '' })}>
          Clear dates
        </button>
        <button
          type="button"
          className="btn btn-primary btn-md"
          onClick={() => onSave(draft)}
          // Half a range prices nothing, so it cannot be saved.
          disabled={Boolean(draft.from) !== Boolean(draft.to)}
        >
          Save
        </button>
      </div>
    </>
  );
}

/**
 * The guest steppers, in a dialog — the listing card and the checkout again.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {object} props.value
 * @param {(next: object) => void} props.onSave
 * @param {() => void} props.onClose
 * @param {number} props.maxGuests
 * @param {boolean} props.petsAllowed
 * @param {number} [props.includedGuests] Guests the nightly rate covers.
 * @param {number} [props.extraGuestFee]  Per extra guest, per night.
 * @param {string} [props.title]
 */
export function ChangeGuestsModal({
  open,
  value,
  onSave,
  onClose,
  maxGuests,
  petsAllowed,
  includedGuests = 0,
  extraGuestFee = 0,
  title = 'Change guests',
}) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={title}
      footer={null}
      centered
      width={480}
      className="checkout-edit-modal"
      destroyOnHidden
    >
      {open ? (
        <GuestsForm
          value={value}
          onSave={onSave}
          onClose={onClose}
          maxGuests={maxGuests}
          petsAllowed={petsAllowed}
          includedGuests={includedGuests}
          extraGuestFee={extraGuestFee}
        />
      ) : null}
    </Modal>
  );
}


function GuestsForm({ value, onSave, onClose, maxGuests, petsAllowed, includedGuests, extraGuestFee }) {
  const [draft, setDraft] = useState(value);
  const note = partyNote({ maxGuests, petsAllowed, includedGuests, extraGuestFee });

  return (
    <>
      <GuestRows
        value={draft}
        onChange={setDraft}
        maxGuests={maxGuests}
        petsAllowed={petsAllowed}
      />
      {note ? <p className="checkout-edit-note">{note}</p> : null}

      <div className="checkout-edit-actions">
        <button type="button" className="btn-link" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary btn-md" onClick={() => onSave(draft)}>
          Save
        </button>
      </div>
    </>
  );
}
