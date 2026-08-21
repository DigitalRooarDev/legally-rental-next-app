'use server';

import { fetchAPI } from '@/lib/api';
import { getUserSession } from '@/actions/getUserSession';
import { toCheckoutQuote } from '@/utils/mappers';

/**
 * `POST /checkoutOrder` — prices a booking. **Creates nothing.**
 *
 * Despite the name this is the quote step: it answers "Order checkout
 * successfully" with the full breakdown — rental amount, deposit, service fee,
 * VAT, wallet balance and `grandTotal` — and no order exists afterwards. That is
 * what makes it safe to call on every change of dates, party or wallet toggle.
 *
 * It is also the only authority on the total. The client can multiply nightly ×
 * nights, but the service-fee percentage (10%), the VAT rate (7.5%) and how many
 * nights of a range count as weekend nights all live server-side.
 *
 * Requires a session: `user_id` is validated, so a signed-out visitor cannot be
 * quoted and the checkout falls back to its own estimate until they sign in.
 *
 * @param {object} input
 * @param {string|number} input.serviceId
 * @param {string} input.from `YYYY-MM-DD`
 * @param {string} input.to   `YYYY-MM-DD`
 * @param {{adults: number, children: number, infants: number, pets: number}} [input.party]
 * @param {number} [input.hours]      Hourly listings.
 * @param {boolean} [input.useWallet] Applies the wallet balance to the total.
 * @param {boolean} [input.useInsurance]
 * @returns {Promise<{status: boolean, message: string,
 *   quote: import('@/utils/mappers').CheckoutQuote|null}>}
 */
export const getCheckoutQuote = async ({
  serviceId,
  from,
  to,
  party,
  hours,
  useWallet = false,
  useInsurance = false,
}) => {
  const { userId, token } = await getUserSession();

  if (!userId) return { status: false, message: 'Sign in to see the full price.', quote: null };
  if (!serviceId || !from || !to) {
    return { status: false, message: 'Choose your dates first.', quote: null };
  }

  try {
    const data = await fetchAPI('checkoutOrder', {
      method: 'POST',
      body: {
        user_id: String(userId),
        service_id: String(serviceId),
        apply_insurance: useInsurance ? '1' : '0',
        apply_wallet: useWallet ? '1' : '0',
        booking_from_date: from,
        booking_to_date: to,
        // Blank rather than "0" for the counts that do not apply — the API's own
        // collection sends `""`, and a party is meaningless for a vehicle.
        adults: party ? String(party.adults ?? '') : '',
        children: party?.children ? String(party.children) : '',
        infants: party?.infants ? String(party.infants) : '',
        pets: party?.pets ? String(party.pets) : '',
        hours: hours ? String(hours) : '',
      },
      token,
    });

    if (!data?.status) {
      return {
        status: false,
        message: data?.message || 'We could not price this booking.',
        quote: null,
      };
    }

    const quote = toCheckoutQuote(data.response);

    /**
     * Said out loud rather than silently absorbed. The checkout falls back to
     * `PAYPAL_FEE_PERCENT` so a missing rate cannot undercharge, but a fallback
     * nobody ever sees is how the client's rate and the server's drift apart —
     * which is the shape of the bug this replaced.
     */
    if (quote && quote.paypalRate > 0 && !(quote.paypalCharges > 0)) {
      console.warn(
        'CHECKOUT QUOTE: checkoutOrder returned a paypal_rate but no paypal_charges — the client fallback is being used.',
      );
    }

    return { status: true, message: data.message ?? '', quote };
  } catch (error) {
    console.error('CHECKOUT QUOTE failed', error);
    return { status: false, message: 'Unable to price this booking right now.', quote: null };
  }
};
