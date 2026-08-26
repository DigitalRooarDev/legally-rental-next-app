'use client';

import { useState } from 'react';
import ReasonDialog from '@/components/my-account/ReasonDialog';
import { getCancellationReasons } from '@/actions/getCancellationReasons';
import { cancelRentalOrder } from '@/actions/cancelRentalOrder';

/**
 * Whether this booking can still be cancelled by the visitor.
 *
 * Three conditions, all from the API, all necessary:
 *
 *   `statusCode === 0`  Pending Approval. Once a host has approved, started or
 *                       finished the stay, cancelling is no longer the buyer's to do.
 *   `!is24Hours`        The flag is true once the stay begins within 24 hours, so
 *                       the window has *closed* — it reads backwards, hence the name
 *                       check rather than a bare truthiness test.
 *   `!isDispute`        A disputed booking is under review; cancelling out from
 *                       under an open dispute would strand the resolution.
 *
 * Exported so the condition is stated once and can be asserted against, rather than
 * being an expression buried in JSX.
 *
 * @param {{statusCode: number|null, is24Hours: boolean, isDispute: boolean}} order
 */
export const canCancelBooking = (order) =>
  order?.statusCode === 0 && !order.is24Hours && !order.isDispute;

/**
 * "Need to Cancel?" — the box under the tracking history, and its dialog.
 *
 * @param {object} props
 * @param {object} props.order From `toOrderDetailViewModel`.
 */
export default function OrderCancelBox({ order }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!canCancelBooking(order)) return null;

  return (
    <div className="checkout-step order-action-box">
      <div className="order-history-title mb-0">Need to Cancel?</div>
      <p className="order-action-lead">Changed your plans?</p>

      <div className="order-action-body">
        <p>
          You can cancel this reservation up to 24 hours before the rental start time. After this
          period, cancellation will no longer be available.
        </p>
        <button
          type="button"
          className="btn btn-danger-soft w-100"
          onClick={() => setIsOpen(true)}
        >
          Cancel booking
        </button>
      </div>

      <ReasonDialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Cancel Reservation"
        reasonLabel="Please select why you're cancelling"
        reasonPlaceholder="Select a reason"
        detailsLabel="Add any additional information about your cancellation"
        detailsPlaceholder="Tell us more about why you're cancelling…"
        loadReasons={getCancellationReasons}
        onSubmit={({ reasonId, description }) =>
          cancelRentalOrder({ orderId: order.id, reasonId, description })
        }
        submitLabel="Cancel reservation"
        /* Filled red, not the tinted trigger above: this is the click that actually
           ends the booking, and it should not look like the one that only asked. */
        submitClassName="btn btn-danger btn-md"
      />
    </div>
  );
}
