'use client';

/**
 * Client-side charging, for the gateways whose money moves in the browser.
 *
 * The order of operations is fixed by the API: the gateway takes the payment and
 * returns its own reference, and only then does `checkoutOrder` record the booking
 * against that `txn_no`. So this module's only job is "charge, and tell me the
 * reference" — it creates nothing and knows nothing about bookings.
 *
 * Every contract here matches the ecommerce app's working integration rather than
 * the gateways' own docs, because that is what this API is known to accept: the
 * exact `payment_type` spellings, which value becomes `txn_no`, and Seerbit
 * reporting through `postMessage` instead of a callback.
 *
 * Calls resolve rather than throw, including cancellation — a payer closing the
 * modal is an ordinary outcome, not an error to report as one.
 */

/**
 * The spellings the API accepts. Inconsistent on purpose: these are the literals
 * the ecommerce integration sends, and the endpoint is the one being matched.
 */
export const PAYMENT_TYPE = Object.freeze({
  PAYSTACK: 'Paystack',
  PAYPAL: 'PAYPAL',
  SEERBIT: 'SEERBIT',
  WALLET: 'Wallet Apply',
});

const failed = (message) => ({ status: false, txnNo: '', details: null, message });
const cancelled = (message = '') => ({ status: false, txnNo: '', details: null, message });
const charged = (txnNo, details) => ({ status: true, txnNo, details, message: '' });

/**
 * Paystack Inline, via the package rather than a script tag — it bundles, so there
 * is no load to wait on and no blocked-script path to handle.
 *
 * Imported **inside** the function, not at the top of the module.
 * `@paystack/inline-js` reads `window` while it is being evaluated, so a static
 * import made this module unloadable on the server — and `'use client'` does not
 * spare it, because a client component is still evaluated once during SSR. The
 * whole checkout page therefore threw `ReferenceError: window is not defined`
 * before rendering a single element, and only ever appeared because React
 * silently re-rendered it in the browser: no server HTML, a blank flash while the
 * bundle loaded, and nothing for a crawler or a failed hydration to fall back on.
 * The dynamic import defers evaluation to the click, which only happens in a
 * browser.
 *
 * Amounts go in kobo, hence the ×100.
 */
const payWithPaystack = async ({ amount, email }) => {
  const key = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
  if (!key) return failed('Paystack is not configured.');

  const { default: PaystackPop } = await import('@paystack/inline-js');

  return new Promise((resolve) => {
    new PaystackPop().newTransaction({
      key,
      email,
      amount: Math.round(amount * 100),
      currency: 'NGN',
      // Paystack's own reference is what the API stores.
      onSuccess: (transaction) => resolve(charged(transaction?.reference ?? '', transaction)),
      onError: (error) => resolve(failed(error?.message || 'Payment error.')),
      onCancel: () => resolve(cancelled('Payment cancelled.')),
    });
  });
};

/**
 * Seerbit Checkout, which reports through `window.postMessage` rather than a
 * callback — opening it returns nothing, so the outcome is awaited on the message
 * bus and the listener is torn down on every exit path.
 *
 * The reference is the one *we* generate: Seerbit echoes it as `tranref`, and it is
 * what the API expects back as `txn_no`.
 */
const payWithSeerbit = ({ amount, email, name, reference }) => {
  const key = process.env.NEXT_PUBLIC_SEERBIT_PUBLIC_KEY;
  if (!key) return Promise.resolve(failed('Seerbit is not configured.'));
  if (typeof window === 'undefined' || !window.SeerbitPay) {
    return Promise.resolve(failed('Seerbit failed to load. Please try again.'));
  }

  return new Promise((resolve) => {
    const settle = (result) => {
      window.removeEventListener('message', onMessage);
      closeSeerbit();
      resolve(result);
    };

    /**
     * Seerbit leaves its own modal open after a terminal event, so it is closed
     * here — by its API where that exists, and by removing its iframe where it
     * does not, otherwise the payer is left staring at a spent checkout.
     */
    const closeSeerbit = () => {
      if (typeof window.SeerbitPay?.close === 'function') {
        window.SeerbitPay.close();
        return;
      }

      document
        .querySelectorAll('iframe[src*="seerbit"], [id*="seerbit"], [class*="seerbit"]')
        .forEach((element) => element.remove());
    };

    function onMessage(event) {
      if (event.data?.type !== 'event') return;

      switch (event.data.message) {
        case 'TRANSACTION_SUCCESSFUL':
          settle(charged(reference, event.data));
          break;
        case 'TRANSACTION_FAILED':
          settle(failed('Payment was not successful.'));
          break;
        case 'MODAL_CLOSED':
        case 'CANCELLED':
          settle(cancelled('Payment cancelled.'));
          break;
        default:
          // Progress chatter — Seerbit emits several before a terminal one.
          break;
      }
    }

    window.addEventListener('message', onMessage);

    window.SeerbitPay({
      public_key: key,
      tranref: reference,
      currency: 'NGN',
      // Naira, not kobo — unlike Paystack.
      amount: Number(amount),
      email,
      full_name: name,
    });
  });
};

/**
 * Charges the payer and returns the gateway's reference.
 *
 * PayPal is deliberately absent: its SDK charges through buttons it renders
 * itself, so it cannot be driven from a function call. `<PaypalButtons>` handles
 * that case and reports the same shape.
 *
 * @param {object} input
 * @param {'PAYSTACK'|'SEERBIT'} input.gateway
 * @param {number} input.amount In naira, not kobo.
 * @param {string} input.email
 * @param {string} [input.name]
 * @param {string} input.reference Our handle for this attempt.
 * @returns {Promise<{status: boolean, txnNo: string, details: object|null, message: string}>}
 */
export const payWithGateway = ({ gateway, amount, email, name, reference }) => {
  if (!(amount > 0)) return Promise.resolve(failed('This booking has no amount to charge.'));
  if (!email) return Promise.resolve(failed('Your account has no email address to bill.'));

  switch (gateway) {
    case 'PAYSTACK':
      return payWithPaystack({ amount, email });
    case 'SEERBIT':
      return payWithSeerbit({ amount, email, name, reference });
    default:
      return Promise.resolve(failed('Choose a payment method.'));
  }
};

/**
 * What PayPal must actually be charged, in dollars.
 *
 * Two API-supplied numbers, neither of them guessable: `paypal_rate` is naira per
 * dollar, and `paypal_charges` is PayPal's processing percentage, which is added
 * on top rather than absorbed. Returns `0` when the rate is missing, which is what
 * stops a guessed rate reaching a real charge.
 *
 * @param {number} totalNgn
 * @param {number} rate     Naira per $1.
 * @param {number} percent  PayPal's fee, e.g. `1.5`.
 */
export const toPaypalUsd = (totalNgn, rate, percent = 0) => {
  if (!(totalNgn > 0) || !(rate > 0)) return 0;

  const usd = Number((totalNgn / rate).toFixed(2));
  const fee = Number(((usd * (percent || 0)) / 100).toFixed(2));

  return Number((usd + fee).toFixed(2));
};
