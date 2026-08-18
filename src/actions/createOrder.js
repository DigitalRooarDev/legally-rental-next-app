'use server';

import { fetchAPI } from '@/lib/api';
import { getUserSession } from '@/actions/getUserSession';

/**
 * `POST /createOrder` — books a listing for a date range.
 *
 * **Not** `checkoutOrder`, which only prices a booking and creates nothing — see
 * `getCheckoutQuote`. The two take almost the same body, which is exactly why
 * calling the wrong one is invisible: the response looks like a success and no
 * order exists afterwards.
 *
 * Body follows the API collection's Checkout Order request: the rental block is
 * `booking_from_date`, `booking_to_date`, `adults`, `children`, `infants`,
 * `pets` and `hours`, alongside `apply_wallet` / `apply_insurance` as `"0"`/`"1"`
 * strings. Counts are sent as strings for the same reason — the collection does.
 *
 * Anything the API rejects comes back in `response` as a field -> messages map,
 * which is surfaced verbatim rather than flattened to a generic failure, so the
 * caller can render it against the form.
 *
 * NB: this is the only call in the app that *creates* something chargeable, so
 * it never runs from a component render — only from the checkout's submit.
 *
 * @param {object} input
 * @param {string|number} input.serviceId
 * @param {string} input.from        `YYYY-MM-DD`
 * @param {string} input.to          `YYYY-MM-DD`
 * @param {{adults: number, children: number, infants: number, pets: number}} [input.party]
 *   Stays only; other rental types book the item itself.
 * @param {number} [input.hours]     Hourly listings.
 * @param {string} input.paymentType
 *   The API's own spelling — `Paystack` | `PAYPAL` | `SEERBIT` | `Wallet Apply`.
 *   Inconsistent casing is deliberate; see `PAYMENT_TYPE` in `@/lib/paymentGateways`.
 * @param {string} [input.txnNo]
 *   The gateway's own reference for a charge that has **already succeeded**. The
 *   money moves first and this call records the booking against it, so an order
 *   without one is an unpaid order.
 * @param {object} [input.paymentResponse]
 *   The gateway's full response, stored alongside the reference for reconciliation.
 * @param {boolean} [input.useWallet] Applies wallet balance before the gateway.
 * @returns {Promise<{status: boolean, message: string, order: object|null,
 *   fieldErrors: Record<string, string>}>}
 */
export const createOrder = async ({
  serviceId,
  from,
  to,
  party,
  hours,
  paymentType,
  txnNo = '',
  paymentResponse = null,
  useWallet = false,
}) => {
  const { userId, token } = await getUserSession();

  if (!userId) {
    return {
      status: false,
      message: 'Sign in to complete this booking.',
      order: null,
      fieldErrors: {},
    };
  }

  if (!serviceId || !from || !to || !paymentType) {
    return {
      status: false,
      message: 'Choose your dates and a payment method first.',
      order: null,
      fieldErrors: {},
    };
  }

  try {
    const data = await fetchAPI('createOrder', {
      method: 'POST',
      body: {
        user_id: String(userId),
        service_id: String(serviceId),
        payment_type: paymentType,
        // The gateway's reference for the charge that already went through. Sent
        // only when there is one, so a wallet-only booking does not carry a blank.
        ...(txnNo ? { txn_no: txnNo } : {}),
        // Serialised because the endpoint takes it as a string, the same way the
        // ecommerce integration sends it.
        ...(paymentResponse ? { paymentResponse: JSON.stringify(paymentResponse) } : {}),
        apply_wallet: useWallet ? '1' : '0',
        apply_insurance: '0',
        booking_from_date: from,
        booking_to_date: to,
        // Omitted rather than sent as 0 for the types that have no party — the
        // collection leaves them blank for non-rental bookings.
        ...(party
          ? {
              adults: String(party.adults ?? 0),
              children: String(party.children ?? 0),
              infants: String(party.infants ?? 0),
              pets: String(party.pets ?? 0),
            }
          : {}),
        ...(hours ? { hours: String(hours) } : {}),
      },
      token,
    });

    if (!data?.status) {
      // Laravel-style `{field: ["message", …]}`; keep the first line per field.
      const response = data?.response;

      const fieldErrors =
        response && typeof response === 'object' && !Array.isArray(response)
          ? Object.fromEntries(
              Object.entries(response)
                .filter(([, messages]) => Array.isArray(messages) && messages.length > 0)
                .map(([field, messages]) => [field, String(messages[0])]),
            )
          : {};

      return {
        status: false,
        message: data?.message || 'We could not complete this booking.',
        order: null,
        fieldErrors,
      };
    }

    return {
      status: true,
      message: data.message ?? '',
      order: data.response ?? null,
      fieldErrors: {},
    };
  } catch (error) {
    console.error('CREATE ORDER failed', error);

    return {
      status: false,
      message: 'Unable to reach the booking service. Please try again.',
      order: null,
      fieldErrors: {},
    };
  }
};
