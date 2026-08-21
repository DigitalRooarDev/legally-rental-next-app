'use client';

import { useEffect, useRef, useState } from 'react';

/** How long to wait for the async SDK tag before offering a retry. */
const SDK_POLL_MS = 250;
const SDK_POLL_TRIES = 60;

/**
 * PayPal's own buttons, which are the only way its SDK takes a payment.
 *
 * Unlike Paystack and Seerbit there is no "open the modal" call to await, so PayPal
 * cannot share the Confirm and Pay button — it gets its own control here, and
 * reports through `onPaid` in the same shape `payWithGateway` resolves with.
 *
 * The captured payment's **capture id** is the reference, not the order id: that is
 * what the ecommerce integration sends as `txn_no`, and the two are different
 * identifiers on the same PayPal transaction.
 *
 * @param {object} props
 * @param {number} props.amountUsd  Already converted and fee-inclusive.
 * @param {(result: {status: boolean, txnNo: string, details: object|null, message: string}) => void} props.onPaid
 *
 * Interaction is gated by the caller in CSS, not here: unmounting the buttons to
 * disable them would make the control jump as the form becomes valid, and PayPal
 * re-renders slowly enough for that to be visible.
 */
export default function PaypalButtons({ amountUsd, onPaid }) {
  const containerRef = useRef(null);

  /**
   * Held in a ref so the effect below does not re-run — and re-render the buttons —
   * every time the parent supplies a fresh callback identity. Written in an effect
   * rather than during render, which React forbids.
   */
  const onPaidRef = useRef(onPaid);

  /**
   * The amount, read at click time instead of baked into the buttons.
   *
   * This is what keeps the buttons mounted exactly once. Keying the render effect
   * on `amountUsd` re-rendered them on every quote refresh — a changed date, a
   * toggled wallet, a re-priced night — and each re-render raced the last: the
   * superseded `render()` was already in flight, so it appended its iframe into
   * the container the new run had just cleared. The visible result was either two
   * sets of buttons or, more often, none at all.
   *
   * `createOrder` runs on click, long after any refresh has settled, so reading
   * the live figure there charges the current total without touching the DOM.
   */
  const amountRef = useRef(amountUsd);

  /** 'loading' until PayPal has drawn something; 'unavailable' once we give up. */
  const [status, setStatus] = useState('loading');
  /** Bumped by Retry — the one thing that re-runs the render effect. */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    onPaidRef.current = onPaid;
  }, [onPaid]);

  useEffect(() => {
    amountRef.current = amountUsd;
  }, [amountUsd]);

  useEffect(() => {
    let cancelled = false;
    let poll;
    let instance;

    /** PayPal's own teardown, then ours — `close()` alone leaves the markup. */
    const teardown = () => {
      try {
        instance?.close();
      } catch {
        // Already closed, or the SDK tore itself down first.
      }
      instance = undefined;
      if (containerRef.current) containerRef.current.innerHTML = '';
    };

    const mount = () => {
      const container = containerRef.current;
      if (cancelled || !container || !window.paypal?.Buttons) return;

      // The SDK appends rather than replaces, so a stale run would stack a second
      // set of buttons on top of the first.
      container.innerHTML = '';

      instance = window.paypal.Buttons({
        createOrder: (_data, actions) => {
          const value = amountRef.current;

          /**
           * Refused rather than sent as 0: the total can only have gone to nothing
           * through a wallet that now covers the booking, and PayPal would answer a
           * zero order with its own opaque error.
           */
          if (!(value > 0)) {
            return Promise.reject(new Error('This booking has no amount to charge.'));
          }

          return actions.order.create({
            // Two decimals always — PayPal reads the amount as a string.
            purchase_units: [{ amount: { value: value.toFixed(2), currency_code: 'USD' } }],
          });
        },

        onApprove: async (_data, actions) => {
          const details = await actions.order.capture();
          const captureId = details?.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? '';

          onPaidRef.current({
            status: Boolean(captureId),
            txnNo: captureId,
            details,
            message: captureId ? '' : 'PayPal did not return a payment reference.',
          });
        },

        onError: (error) => {
          onPaidRef.current({
            status: false,
            txnNo: '',
            details: null,
            message: error?.message || 'PayPal error.',
          });
        },

        onCancel: () => {
          onPaidRef.current({
            status: false,
            txnNo: '',
            details: null,
            message: 'PayPal cancelled.',
          });
        },
      });

      instance
        .render(container)
        .then(() => {
          // Unmounted mid-render: close it, or the iframe outlives the component.
          if (cancelled) teardown();
          else setStatus('ready');
        })
        .catch(() => {
          if (!cancelled) setStatus('unavailable');
        });
    };

    // The SDK tag is `async`, so it may not have defined `window.paypal` yet.
    if (window.paypal?.Buttons) {
      mount();
    } else {
      let tries = 0;
      poll = setInterval(() => {
        tries += 1;

        if (window.paypal?.Buttons) {
          clearInterval(poll);
          mount();
        } else if (tries >= SDK_POLL_TRIES) {
          clearInterval(poll);
          /**
           * Reported in place, not through `onPaid`: a script that never loaded is
           * not a failed payment, and routing it there raised a "payment failed"
           * toast over a booking nobody had tried to pay for yet — and left no way
           * back, since the buttons only remounted if the amount happened to
           * change. The retry below is that way back.
           */
          if (!cancelled) setStatus('unavailable');
        }
      }, SDK_POLL_MS);
    }

    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
      teardown();
    };
  }, [attempt]);

  return (
    <>
      {/* Always in the DOM: PayPal renders into a live, laid-out node, and a
          container swapped out for a message would have nothing to draw into. */}
      <div className="checkout-paypal" ref={containerRef} />

      {status === 'loading' ? (
        <p className="checkout-method-note">Loading PayPal…</p>
      ) : null}

      {status === 'unavailable' ? (
        <p className="checkout-method-note">
          PayPal could not be loaded.{' '}
          <button
            type="button"
            className="btn-link"
            onClick={() => {
              setStatus('loading');
              setAttempt((value) => value + 1);
            }}
          >
            Try again
          </button>
        </p>
      ) : null}
    </>
  );
}
