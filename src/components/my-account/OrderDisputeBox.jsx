'use client';

import { useState } from 'react';
import ReasonDialog from '@/components/my-account/ReasonDialog';
import { getDisputeReasons } from '@/actions/getDisputeReasons';
import { raiseOrderDispute } from '@/actions/raiseOrderDispute';
import { formatDateTime } from '@/utils/formats';

/**
 * "Reservation Dispute" — the box under the tracking history, and its dialog.
 *
 * Shown when the API says a dispute is possible (`isRentalDisputeAvailable`), and
 * *also* whenever one is already on file: the flag describes whether a **new**
 * dispute would be accepted, so a booking whose dispute is already raised can fail
 * that test — and hiding the box then would take the visitor's own dispute off the
 * only page that mentions it.
 *
 * @param {object} props
 * @param {string|number} props.orderId  The order's numeric `id`.
 * @param {boolean} props.canRaise       `order.isRentalDisputeAvailable`.
 * @param {{reason: string, description: string, raisedAt: string}|null} [props.dispute]
 *   The dispute already raised, from `order.dispute`.
 */
export default function OrderDisputeBox({ orderId, canRaise, dispute = null }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!canRaise && !dispute) return null;

  return (
    <div className="checkout-step order-action-box">
      <div className="order-history-title mb-0">Reservation Dispute</div>
      <p className="order-action-lead">
        {dispute ? 'Your dispute is with our team.' : 'Experienced an issue during your rental?'}
      </p>

      {dispute ? (
        <div className="order-action-body">
          <p>
            A dispute has been raised for this booking
            {dispute.raisedAt ? ` on ${formatDateTime(dispute.raisedAt)}` : ''}. Our team is
            reviewing it with your host and will be in touch.
          </p>
          {dispute.reason ? (
            <p className="order-reason">
              <b>Reason:</b> {dispute.reason}
            </p>
          ) : null}
          {dispute.description ? (
            <p className="order-reason">
              <b>Details:</b> {dispute.description}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="order-action-body">
          <p>
            If you encounter any problems with your reservation, you can raise a dispute using the
            button below. This will initiate the resolution process involving both the host and
            platform administration to ensure a fair outcome for everyone.
          </p>
          <button
            type="button"
            className="btn btn-danger-soft w-100"
            onClick={() => setIsOpen(true)}
          >
            Raise dispute
          </button>
        </div>
      )}

      <ReasonDialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Raise Dispute"
        reasonLabel="Please select the reason for your dispute"
        reasonPlaceholder="Select reason"
        detailsLabel="Provide details about the issue"
        detailsPlaceholder="Describe the issue in detail…"
        /* Unlike a cancellation, a dispute with no account of what went wrong gives
           the resolver nothing to act on. */
        requireDetails
        loadReasons={getDisputeReasons}
        onSubmit={({ reasonId, description }) =>
          raiseOrderDispute({ orderId, reasonId, description })
        }
        submitLabel="Submit dispute"
      />
    </div>
  );
}
