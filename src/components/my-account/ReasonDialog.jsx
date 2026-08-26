'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from 'antd';
import { useToast } from '@/context/toastContext';

/** Enough for a useful account; neither endpoint states a cap of its own. */
const MAX_DESCRIPTION = 1000;

/**
 * "Pick a reason, add details, submit" — the dialog behind both booking actions.
 *
 * Cancelling and disputing differ in their copy, their endpoints and when they are
 * offered, but not in their mechanics: fetch a reason list on open, validate, post
 * once, refresh the page. Held here so the parts that must not be got wrong twice —
 * the double-submit guard, the close-while-submitting block, and refreshing rather
 * than mirroring the API's new state into local state — exist once.
 *
 * Both endpoints create records that cannot be undone, so nothing here retries.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.title
 * @param {string} props.reasonLabel
 * @param {string} props.reasonPlaceholder  The empty option's text.
 * @param {string} props.detailsLabel
 * @param {string} props.detailsPlaceholder
 * @param {boolean} [props.requireDetails]
 *   Whether the description must be filled. A dispute is useless to a resolver
 *   without one; a cancellation asks only for "any additional information".
 * @param {() => Promise<{message: string, reasons: Array<{value: string, label: string}>}>} props.loadReasons
 * @param {(input: {reasonId: string, description: string}) => Promise<{status: boolean, message: string}>} props.onSubmit
 * @param {string} props.submitLabel
 * @param {string} [props.submitClassName]
 */
export default function ReasonDialog({
  open,
  onClose,
  title,
  reasonLabel,
  reasonPlaceholder,
  detailsLabel,
  detailsPlaceholder,
  requireDetails = false,
  loadReasons,
  onSubmit,
  submitLabel,
  submitClassName = 'btn btn-primary btn-md',
}) {
  const router = useRouter();
  const toast = useToast();

  const [reasons, setReasons] = useState([]);
  /** 'idle' | 'loading' | 'ready' | 'failed' — drives the picker's own state. */
  const [loadState, setLoadState] = useState('idle');
  const [reasonId, setReasonId] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  /**
   * Called by the parent's trigger rather than run in an effect on `open`: the
   * dialog is opened by a deliberate click, so the fetch belongs to that click and
   * not to a re-render that happens to arrive with `open` already true.
   */
  const load = async () => {
    setError('');

    // Already loaded: both lists are reference data, identical for every booking.
    if (reasons.length > 0) return;

    setLoadState('loading');
    const result = await loadReasons();

    setReasons(result.reasons);
    setLoadState(result.reasons.length > 0 ? 'ready' : 'failed');

    if (result.reasons.length === 0) {
      setError(result.message || 'No reasons are available right now.');
    }
  };

  const close = () => {
    // Never mid-submit: the request is already with the server, and closing here
    // would leave the visitor unsure whether it landed.
    if (isSubmitting) return;

    setError('');
    onClose();
  };

  const submit = async () => {
    if (isSubmitting) return;

    if (!reasonId) {
      setError('Choose a reason to continue.');
      return;
    }

    if (requireDetails && !description.trim()) {
      setError('Add some detail before submitting.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const result = await onSubmit({ reasonId, description });

      if (!result.status) {
        setError(result.message);
        return;
      }

      toast.success(result.message);
      setReasonId('');
      setDescription('');
      onClose();

      /**
       * Re-runs the server render, so the boxes, the status badge and the tracking
       * history all come back from the API together. Cheaper and less brittle than
       * mirroring the new state locally, which would then be this page's second
       * opinion on what the API holds.
       */
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBlocked = isSubmitting || loadState === 'loading' || reasons.length === 0;

  return (
    <Modal
      open={open}
      onCancel={close}
      title={title}
      footer={null}
      centered
      width={480}
      className="checkout-edit-modal"
      destroyOnHidden
      maskClosable={!isSubmitting}
      afterOpenChange={(isOpen) => {
        if (isOpen) load();
      }}
    >
      <div className="reason-form">
        <label className="reason-field" htmlFor={`${title}-reason`}>
          <span className="reason-label">{reasonLabel}</span>
          <select
            id={`${title}-reason`}
            className="form-control form-select"
            value={reasonId}
            onChange={(event) => setReasonId(event.target.value)}
            disabled={isBlocked}
          >
            <option value="">
              {loadState === 'loading' ? 'Loading reasons…' : reasonPlaceholder}
            </option>
            {reasons.map((reason) => (
              <option key={reason.value} value={reason.value}>
                {reason.label}
              </option>
            ))}
          </select>
        </label>

        <label className="reason-field" htmlFor={`${title}-details`}>
          <span className="reason-label">{detailsLabel}</span>
          <textarea
            id={`${title}-details`}
            className="form-control"
            rows={4}
            maxLength={MAX_DESCRIPTION}
            placeholder={detailsPlaceholder}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={isSubmitting}
          />
          <span className="reason-count">
            {description.length}/{MAX_DESCRIPTION}
          </span>
        </label>

        {error ? <p className="checkout-error">{error}</p> : null}

        <div className="checkout-edit-actions">
          <button type="button" className="btn-link" onClick={close} disabled={isSubmitting}>
            Go back
          </button>
          <button
            type="button"
            className={submitClassName}
            onClick={submit}
            disabled={isBlocked}
          >
            {isSubmitting ? 'Submitting…' : submitLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
