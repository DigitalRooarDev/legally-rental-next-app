'use client';

import { useEffect, useRef } from 'react';

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

  useEffect(() => {
    onPaidRef.current = onPaid;
  }, [onPaid]);

  useEffect(() => {
    if (!(amountUsd > 0)) return undefined;

    let cancelled = false;
    let poll;

    const mount = () => {
      const container = containerRef.current;
      if (cancelled || !container || !window.paypal?.Buttons) return;

      // The SDK appends rather than replaces, so a re-render would stack a second
      // set of buttons on top of the first.
      container.innerHTML = '';

      window.paypal
        .Buttons({
          createOrder: (_data, actions) =>
            actions.order.create({
              purchase_units: [{ amount: { value: String(amountUsd), currency_code: 'USD' } }],
            }),

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
        })
        .render(container);
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
        } else if (tries > 20) {
          clearInterval(poll);
          if (!cancelled) {
            onPaidRef.current({
              status: false,
              txnNo: '',
              details: null,
              message: 'PayPal failed to load. Please try again.',
            });
          }
        }
      }, 300);
    }

    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
    };
  }, [amountUsd]);

  return <div className="checkout-paypal" ref={containerRef} />;
}
