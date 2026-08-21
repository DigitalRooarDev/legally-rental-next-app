'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useToast } from '@/context/toastContext';
import { ChangeDatesModal, ChangeGuestsModal } from '@/components/rental/BookingEditModals';
import { clampHours } from '@/components/rental/BookingHoursPicker';
import { formatBookingLength, resolveBookingLength } from '@/lib/bookingLength';
import { PAYMENT_TYPE, payWithGateway, toPaypalUsd } from '@/lib/paymentGateways';
import PaypalButtons from '@/components/rental/PaypalButtons';
import CheckoutSummary from '@/components/rental/CheckoutSummary';
import { nightsBetween } from '@/components/rental/ServiceBookingCard';
import { toBookingParams } from '@/lib/bookingParams';
import { toDayjs } from '@/components/theme/DateField';
import { createOrder } from '@/actions/createOrder';
import { getCheckoutQuote } from '@/actions/getCheckoutQuote';
import { useAuth } from '@/context/authContext';
import { CURRENCY_SYMBOL } from '@/lib/constants';

/**
 * The gateways `createOrder` accepts as `payment_type`.
 *
 * Kept as data so the radio list, the submitted value and the default can never
 * drift apart.
 */
const PAYMENT_METHODS = Object.freeze([
  {
    value: 'PAYSTACK',
    apiValue: PAYMENT_TYPE.PAYSTACK,
    label: 'Pay with Paystack',
    hint: 'Secure card payment via Paystack.',
  },
  {
    value: 'SEERBIT',
    apiValue: PAYMENT_TYPE.SEERBIT,
    label: 'Pay with Seerbit',
    hint: 'Card, transfer or USSD via Seerbit.',
  },
  {
    value: 'PAYPAL',
    apiValue: PAYMENT_TYPE.PAYPAL,
    label: 'Pay with PayPal',
    hint: 'Pay in USD with your PayPal account.',
    /** Stated before the visitor commits, not discovered on PayPal's own screen. */
    note: 'A 1.5% fee charge by Paypal for processing',
    /** Settles in dollars, so the naira total is converted at the quote's rate. */
    currency: 'USD',
  },
]);

const toNumber = (value) => {
  const parsed = Number.parseFloat(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * "21–23 Aug 2026", "28 Aug – 2 Sep 2026", or a single "22 Aug 2026".
 *
 * The one-day case is not cosmetic: an hourly booking sends the same date as both
 * ends, and "22–22 Aug 2026" reads as a typo.
 */
const formatDateSpan = (start, end) => {
  if (!start || !end) return '';
  if (start.isSame(end, 'day')) return start.format('D MMM YYYY');

  return start.isSame(end, 'month')
    ? `${start.format('D')}–${end.format('D MMM YYYY')}`
    : `${start.format('D MMM')} – ${end.format('D MMM YYYY')}`;
};

const money = (value) =>
  `${CURRENCY_SYMBOL}${value.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/**
 * Builds the price breakdown from the listing and the chosen dates.
 *
 * A fallback, not the authority: `checkoutOrder` prices a booking properly and is
 * what `getCheckoutQuote` calls, but it needs a session, so a signed-out visitor
 * gets this arithmetic instead. It leaves out everything only the server knows —
 * the discounts, the service fee and the VAT — hence the "estimated total" notice
 * that goes with it.
 */
export const buildQuote = (service, from, to, hours = 0) => {
  const nights = nightsBetween(from, to);
  const rate = toNumber(service.amount);
  const refundable = toNumber(service.cautionAmount);

  // An hourly listing sells hours, so that — not the night count — is what the
  // rate multiplies. Both are shown as "rate × n unit" so the line reads the same.
  const units = service.isHourly ? hours : nights;
  const unit = service.isHourly ? 'hour' : 'night';

  const rentalLines = [];

  if (units > 0 && rate > 0) {
    rentalLines.push({
      key: 'rate',
      label: `${money(rate)} × ${units} ${unit}${units === 1 ? '' : 's'}`,
      amount: rate * units,
    });
  }

  if (refundable > 0) {
    rentalLines.push({
      key: 'deposit',
      label: 'Deposit Amount',
      amount: refundable,
      note: 'refundable',
    });
  }

  // The listing's own per-stay fees (cleaning, pet, extra guest). Grouped under
  // "Fees" to match the shape `toCheckoutQuote` returns, so `<CheckoutSummary />`
  // renders one structure and the panel does not reflow when the real quote
  // replaces this estimate on sign-in.
  const feeLines = (service.booking?.fees ?? []).map((fee) => ({
    key: fee.key,
    label: fee.label,
    amount: toNumber(fee.amount),
  }));

  const sections = [
    { key: 'rental', title: '', lines: rentalLines },
    { key: 'fees', title: 'Fees', lines: feeLines },
  ].filter((section) => section.lines.length > 0);

  const start = toDayjs(from);
  const end = toDayjs(to);

  return {
    nights,
    hours: service.isHourly ? hours : 0,
    /** "1 week" / "7 nights" — the span said in the unit the listing is sold by. */
    lengthLabel: formatBookingLength({ nights, hours, length: resolveBookingLength(service) }),
    sections,
    refundable,
    total: sections.reduce(
      (sum, section) => sum + section.lines.reduce((acc, line) => acc + line.amount, 0),
      0,
    ),
    dateLabel: formatDateSpan(start, end),
  };
};

/**
 * "Confirm and Pay" — the three-step checkout.
 *
 * Steps are disclosure, not routing: everything lives on one page so the summary
 * stays visible and a half-finished booking cannot be deep-linked into. The
 * first step collapses to "done" for a signed-in visitor rather than being
 * skipped, so the numbering always matches the design.
 *
 * @param {object} props
 * @param {import('@/utils/mappers').ServiceDetailViewModel} props.service
 * @param {string} props.from  `YYYY-MM-DD`
 * @param {string} props.to
 * @param {{adults: number, children: number, infants: number, pets: number}} props.party
 * @param {number} [props.hours] Hourly listings; `0` when the URL carried none.
 */
export default function CheckoutFlow({
  service,
  from: initialFrom,
  to: initialTo,
  party: initialParty,
  hours: initialHours = 0,
}) {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();

  /**
   * Editable here rather than only on the listing: the summary's Edit links open
   * dialogs, and a change has to re-price without a round trip to the listing
   * and back. Seeded from the URL, and written back to it on every change so a
   * refresh — or the sign-in detour — keeps the edit.
   */
  const [dates, setDates] = useState({ from: initialFrom, to: initialTo });
  const [party, setParty] = useState(initialParty);
  const [editing, setEditing] = useState(null);

  /**
   * Editable here, like the dates and the party.
   *
   * It used to be read straight off the URL and held constant, which made an
   * hourly booking the one thing the checkout could not change: the length *is*
   * the hour count, so a visitor who wanted three hours instead of one had to go
   * back to the listing. It now has its own row in the summary, with the stepper
   * in it rather than an Edit link — one number does not need a dialog.
   *
   * `0` for anything not priced by the hour, which is what keeps `hours` out of
   * the URL and off the order for every other listing.
   */
  const [hours, setHours] = useState(() => (service.isHourly ? clampHours(initialHours) : 0));

  /** The seller's length rules, resolved exactly as the listing card resolves them. */
  const length = useMemo(() => resolveBookingLength(service), [service]);

  const { from, to } = dates;

  const [paymentType, setPaymentType] = useState(PAYMENT_METHODS[0].value);
  const [useWallet, setUseWallet] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  /** The client-side estimate — what a signed-out visitor sees. */
  const estimate = useMemo(() => buildQuote(service, from, to, hours), [service, from, to, hours]);

  /**
   * The last quote the API returned, tagged with the booking it priced.
   *
   * "Loading" is derived from that tag rather than stored: a separate flag would
   * have to be raised synchronously inside the effect, which is the cascading
   * render React warns about. Comparing keys says the same thing for free.
   */
  const [pricing, setPricing] = useState({ quote: null, key: '', error: '' });

  const listingHref = `/rental/${service.slug}`;
  const hasDates = Boolean(from && to && estimate.nights > 0);

  /**
   * Re-priced whenever anything the total depends on changes — and on first
   * paint, which is what makes a refresh show live figures rather than the
   * estimate. Keyed on a string so a fresh `party` object each render does not
   * re-request an unchanged booking.
   */
  const pricingKey = `${service.id}|${from}|${to}|${party.adults}|${party.children}|${party.infants}|${party.pets}|${hours}|${useWallet}`;

  useEffect(() => {
    if (!isAuthenticated || !hasDates) return undefined;

    let cancelled = false;

    getCheckoutQuote({
      serviceId: service.id,
      from,
      to,
      party: service.booking?.takesGuests ? party : null,
      hours,
      useWallet,
    }).then((result) => {
      if (cancelled) return;
      setPricing({
        quote: result.quote,
        key: pricingKey,
        // Only a real failure is worth showing; the estimate carries on regardless.
        error: result.status ? '' : result.message,
      });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `pricingKey` stands in for the booking inputs; see above
  }, [pricingKey, isAuthenticated, hasDates]);

  const isPricing = isAuthenticated && hasDates && pricing.key !== pricingKey;

  /**
   * Applies an edit and mirrors it into the URL, without a navigation.
   *
   * Takes the hour count too, so the URL it writes matches the state it sets. An
   * edit that changed hours while the query kept the old number would survive a
   * refresh as the old booking — and the sign-in round trip reads that same query.
   */
  const applyEdit = (nextDates, nextParty, nextHours = hours) => {
    setDates(nextDates);
    setParty(nextParty);
    setHours(service.isHourly ? clampHours(nextHours) : 0);
    setEditing(null);

    const query = toBookingParams({
      dates: nextDates,
      party: nextParty,
      takesGuests: Boolean(service.booking?.takesGuests),
      hours: service.isHourly ? clampHours(nextHours) : 0,
    }).toString();

    window.history.replaceState(null, '', query ? `${pathname}?${query}` : pathname);
  };

  const dateLabel = formatDateSpan(toDayjs(from), toDayjs(to));

  // The server's numbers win as soon as they arrive: it alone knows the fee
  // percentage, the VAT rate and how many nights of the range are weekend ones.
  /**
   * `lengthLabel` is carried over from the estimate rather than read off the API
   * response, which does not send one: the span is the visitor's own choice and
   * is the same either way, so the label must not blank out the moment the
   * server's figures arrive.
   */
  const quote = pricing.quote ? { ...pricing.quote, lengthLabel: estimate.lengthLabel } : estimate;
  const walletBalance = pricing.quote ? pricing.quote.walletBalance : toNumber(user?.wallet);

  const selectedMethod = PAYMENT_METHODS.find((method) => method.value === paymentType);

  /**
   * The naira total in dollars — not shown anywhere, but it is what PayPal has to
   * be *charged*, since it settles in USD while every figure here is in naira.
   *
   * `paypal_rate` is naira per dollar, so the total divides by it. Empty unless the
   * API actually sent a rate, which is what stops a guessed rate reaching a real
   * charge: with no rate there is no dollar amount, and PayPal cannot proceed.
   */
  const paypalUsd =
    selectedMethod?.currency === 'USD'
      ? toPaypalUsd(quote.total, quote.paypalRate, quote.paypalCharges)
      : 0;

  /**
   * The wallet covered the whole booking, so no gateway is involved and there is
   * no reference to collect. `walletApplied` is the server's figure for how much
   * of the total it absorbed.
   */
  const isWalletOnly = useWallet && quote.total <= 0 && (quote.walletApplied ?? 0) > 0;

  /** PayPal cannot be driven from the shared button; it renders its own. */
  const isPaypal = paymentType === 'PAYPAL';

  /**
   * The whole selection, for the sign-in round trip: step 1 sends the visitor to
   * `/login` and back, and the booking has to survive that intact.
   */
  const partyParams = toBookingParams({
    dates: { from, to },
    party,
    takesGuests: Boolean(service.booking?.takesGuests),
    hours,
  }).toString();

  /**
   * Records the booking against a charge that has **already succeeded**.
   *
   * Split from the charging step because the two are reached differently: Paystack
   * and Seerbit resolve back into `handleSubmit`, while PayPal reports from its own
   * buttons. Both land here so the order, the error handling and the redirect exist
   * once.
   */
  const recordOrder = async ({ txnNo, paymentResponse }) => {
    const result = await createOrder({
      serviceId: service.id,
      from,
      to,
      // Only stays send a party; the endpoint leaves the fields blank otherwise.
      party: service.booking?.takesGuests ? party : null,
      hours,
      paymentType: selectedMethod?.apiValue ?? PAYMENT_TYPE.WALLET,
      txnNo,
      paymentResponse,
      useWallet,
    });

    if (!result.status) {
      setFieldErrors(result.fieldErrors);

      /**
       * The charge went through but the booking did not record. Never presented as
       * a plain failure: the visitor has paid, and the reference is the only thing
       * that lets support reconcile it.
       */
      toast.error(
        txnNo
          ? `${result.message} Your payment reference is ${txnNo} — please contact support before paying again.`
          : result.message,
      );
      return;
    }

    toast.success(result.message || 'Booking confirmed.');

    const orderNumber =
      result.order?.order_number ?? result.order?.orderNumber ?? result.order?.id ?? '';

    router.push(
      orderNumber
        ? `/booking-confirmed?order=${encodeURIComponent(orderNumber)}`
        : '/booking-confirmed',
    );
  };

  /** PayPal's buttons have already taken the money by the time this runs. */
  const handlePaypalPaid = async (charge) => {
    if (!charge.status) {
      if (charge.message) toast.error(charge.message);
      return;
    }

    setIsSubmitting(true);
    try {
      await recordOrder({ txnNo: charge.txnNo, paymentResponse: charge.details });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setFieldErrors({});
    setIsSubmitting(true);

    /**
     * Money first, order second.
     *
     * The gateway charges in the browser and hands back its own reference, which
     * `checkoutOrder` then records the booking against — an order created without
     * one is an unpaid order, so this sequence is not interchangeable.
     */
    try {
      // A booking settled entirely from the wallet never reaches a gateway, so
      // there is no reference to collect.
      if (isWalletOnly) {
        await recordOrder({ txnNo: '', paymentResponse: null });
        return;
      }

      const charge = await payWithGateway({
        gateway: paymentType,
        amount: quote.total,
        email: user?.email ?? '',
        // The profile endpoint returns snake_case; the camelCase spellings are a
        // fallback for the newer flat shape `getUserProfile` also accepts.
        name:
          [user?.first_name ?? user?.firstName, user?.last_name ?? user?.lastName]
            .filter(Boolean)
            .join(' ') ||
          (user?.name ?? ''),
        reference: `SB_${Date.now()}`,
      });

      if (!charge.status) {
        // Cancelled at the gateway, or it refused the card. Nothing was created, so
        // the visitor can simply try again.
        if (charge.message) toast.error(charge.message);
        return;
      }

      await recordOrder({ txnNo: charge.txnNo, paymentResponse: charge.details });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="checkout-sec">
      <div className="container">
        <div className="checkout-head">
          <Link className="checkout-back" href={listingHref} aria-label="Back to listing">
            <i className="icon icon-chevron-left" aria-hidden="true" />
          </Link>
          <h1 className="checkout-title">Confirm and Pay</h1>
        </div>

        {!hasDates ? (
          <div className="notice-bar">
            Pick your dates on the listing before continuing.{' '}
            <Link href={listingHref}>Choose dates</Link>
          </div>
        ) : null}

        <div className="row checkout-row">
          <div className="col-lg-7">
            {isAuthenticated ? (
              <div className="checkout-step-body">
                <p className="checkout-lead">
                  Proceed to payment
                  <small>You&apos;ll be directed to your gateway to complete payment.</small>
                </p>

                {walletBalance > 0 ? (
                  <div className="checkout-wallet-group">
                    <label className="checkout-wallet">
                      <input
                        type="checkbox"
                        checked={useWallet}
                        onChange={(event) => setUseWallet(event.target.checked)}
                      />
                      <span class="checkout-wallet-icon">
                        <i class="icon icon-wallet" aria-hidden="true"></i>
                      </span>
                      <span>
                        Use Wallet Balance
                        <small>
                          Available: <font>{money(walletBalance)}</font>
                        </small>
                      </span>
                    </label>
                  </div>
                ) : null}
                <div className="checkout-methods--group">
                  <h3 className="checkout-methods--group-title">Payment Method</h3>
                  <div className="checkout-methods">
                    {PAYMENT_METHODS.map((method) => (
                      <label
                        key={method.value}
                        className={`checkout-method ${
                          paymentType === method.value ? 'is-selected' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment-method"
                          value={method.value}
                          checked={paymentType === method.value}
                          onChange={() => {
                            setPaymentType(method.value);
                            /**
                             * The agreement is to *this* button: "By selecting the
                             * button, I agree" reads against whichever control is
                             * about to charge, so switching method withdraws the
                             * tick rather than carrying it across.
                             *
                             * It also re-gates PayPal — its buttons are live the
                             * moment they are un-dimmed, with no Confirm step in
                             * between to catch a stale agreement.
                             */
                            setAgreed(false);
                            // A rejection about the old method is not about the new one.
                            setFieldErrors({});
                          }}
                        />
                        <span>
                          {method.label}
                          <small>{method.hint}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                  {selectedMethod?.note ? (
                    <p className="checkout-method-note">{selectedMethod.note}</p>
                  ) : null}

                  {fieldErrors.payment_type ? (
                    <p className="checkout-error">{fieldErrors.payment_type}</p>
                  ) : null}
                </div>

                <div className="checkout-methods--footer">
                  <label className="checkout-terms">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(event) => setAgreed(event.target.checked)}
                    />
                    <span>By selecting the button, I agree to the booking terms.</span>
                  </label>

                  {/* Whatever the API rejected that this form has no field for
                        — dates, guests — still has to be readable. */}
                  {Object.entries(fieldErrors)
                    .filter(([field]) => field !== 'payment_type')
                    .map(([field, message]) => (
                      <p className="checkout-error" key={field}>
                        {message}
                      </p>
                    ))}

                  {/* PayPal's SDK only charges through buttons it draws itself, so
                      it replaces the shared one rather than sitting beside a
                      Confirm that could not drive it. The terms checkbox still
                      gates it — the buttons are drawn but inert until it is ticked,
                      and a method change clears the tick, so they re-gate too. */}
                  {isPaypal ? (
                    paypalUsd > 0 ? (
                      /* Shown but inert until the booking is payable and the terms
                         are ticked — dimmed and click-through-proof rather than
                         swapped for a message, so the control never moves under
                         the pointer as the form becomes valid. */
                      <div
                        className={`checkout-paypal-gate ${
                          !agreed || !hasDates || isSubmitting ? 'is-disabled' : ''
                        }`.trim()}
                        aria-disabled={!agreed || !hasDates || isSubmitting}
                      >
                        <PaypalButtons amountUsd={paypalUsd} onPaid={handlePaypalPaid} />
                      </div>
                    ) : (
                      <p className="checkout-method-note">
                        PayPal is unavailable for this booking — no exchange rate was returned.
                      </p>
                    )
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary w-100"
                      onClick={handleSubmit}
                      disabled={!agreed || !hasDates || isSubmitting}
                    >
                      {isSubmitting ? 'Confirming…' : 'Confirm and Pay'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="checkout-step-body">
                <ol className="checkout-steps">
                  <li className={`checkout-step ${isAuthenticated ? 'is-done' : 'is-active'}`}>
                    <div className="checkout-step-head">
                      <h2>1. Log in or sign up</h2>
                      <Link
                        className="btn btn-primary btn-sm"
                        href={`/login?redirect=${encodeURIComponent(
                          `${listingHref}/checkout?${partyParams}`,
                        )}`}
                      >
                        Continue
                      </Link>
                    </div>
                  </li>

                  <li className={`checkout-step ${isAuthenticated ? 'is-active' : 'is-locked'}`}>
                    <div className="checkout-step-head">
                      <h2>2. Add a payment method</h2>
                    </div>
                  </li>

                  <li className={`checkout-step ${isAuthenticated ? 'is-active' : 'is-locked'}`}>
                    <div className="checkout-step-head">
                      <h2>3. Review your reservation</h2>
                    </div>
                  </li>
                </ol>
              </div>
            )}
          </div>

          <div className="col-lg-5">
            <CheckoutSummary
              service={service}
              quote={quote}
              party={party}
              takesGuests={Boolean(service.booking?.takesGuests)}
              dateLabel={dateLabel}
              hours={hours}
              onEditDates={() => setEditing('dates')}
              // No dialog: the stepper applies straight away and re-prices, the
              // same path an edit dialog's Save takes.
              onHoursChange={(nextHours) => applyEdit(dates, party, nextHours)}
              onEditGuests={() => setEditing('guests')}
              isPricing={isPricing}
              isEstimate={!pricing.quote}
            />
          </div>
        </div>
      </div>

      <ChangeDatesModal
        open={editing === 'dates'}
        value={dates}
        onClose={() => setEditing(null)}
        onSave={(nextDates) => applyEdit(nextDates, party)}
        // The same resolved rules the listing card uses, so a weekly listing
        // stays weekly when the dates are changed here.
        length={length}
        unavailableDates={service.unavailableDates}
      />


      <ChangeGuestsModal
        open={editing === 'guests'}
        value={party}
        onClose={() => setEditing(null)}
        onSave={(nextParty) => applyEdit(dates, nextParty)}
        maxGuests={service.booking?.maxGuests ?? 0}
        petsAllowed={Boolean(service.booking?.petsAllowed)}
        includedGuests={service.booking?.includedGuests ?? 0}
        extraGuestFee={service.booking?.extraGuestFee ?? 0}
      />
    </section>
  );
}
