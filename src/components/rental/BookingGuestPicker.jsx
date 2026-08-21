'use client';

import { useState } from 'react';
import { ChangeGuestsModal } from '@/components/rental/BookingEditModals';
import { EMPTY_PARTY } from '@/lib/bookingParams';

/** "1 guest, 2 infants" — what the closed trigger reads. */
export const summariseParty = (party = EMPTY_PARTY) => {
  const guests = (party.adults ?? 0) + (party.children ?? 0);
  const parts = [`${guests} guest${guests === 1 ? '' : 's'}`];

  if (party.infants > 0) parts.push(`${party.infants} infant${party.infants === 1 ? '' : 's'}`);
  if (party.pets > 0) parts.push(`${party.pets} pet${party.pets === 1 ? '' : 's'}`);

  return parts.join(', ');
};

/**
 * Guest picker for the booking card — trigger plus the dialog it opens.
 *
 * Only stays render this. A vehicle or a dress is booked as an item, so a party
 * would be collected and then sent nowhere.
 *
 * The dialog is the checkout's own `<ChangeGuestsModal>`, so choosing a party on
 * the listing and changing it at checkout are the same control, not two that
 * have to be kept in agreement.
 *
 * @param {object} props
 * @param {{adults: number, children: number, infants: number, pets: number}} props.value
 * @param {(next: object) => void} props.onChange
 * @param {number} props.maxGuests    0 when the listing sets no cap.
 * @param {boolean} props.petsAllowed
 * @param {number} [props.includedGuests] Guests the nightly rate covers.
 * @param {number} [props.extraGuestFee]  Per extra guest, per night.
 */
export default function BookingGuestPicker({
  value,
  onChange,
  maxGuests,
  petsAllowed,
  includedGuests = 0,
  extraGuestFee = 0,
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="booking-guests">
      <button
        type="button"
        className="booking-field-trigger booking-guests-trigger"
        onClick={() => setIsOpen(true)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <span className="booking-field-label">Guests</span>
        <span className="booking-field-value booking-guests-value">{summariseParty(value)}</span>
        <i className="icon icon-chevron-down" aria-hidden="true" />
      </button>

      <ChangeGuestsModal
        open={isOpen}
        value={value}
        title="Guests"
        onClose={() => setIsOpen(false)}
        onSave={(next) => {
          onChange(next);
          setIsOpen(false);
        }}
        maxGuests={maxGuests}
        petsAllowed={petsAllowed}
        includedGuests={includedGuests}
        extraGuestFee={extraGuestFee}
      />
    </div>
  );
}
