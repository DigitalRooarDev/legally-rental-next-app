import Link from 'next/link';

export const metadata = {
  title: 'Booking confirmed',
  // Nobody should arrive here from a search result — it only means anything
  // immediately after a payment.
  robots: { index: false, follow: false },
};

/**
 * `/booking-confirmed?order=<orderNumber>`
 *
 * Shown once the gateway has taken the money *and* `checkoutOrder` has recorded
 * the booking against that charge. A separate route rather than a state on the
 * checkout so the back button cannot land the visitor on a payment form for a
 * booking they have already paid for, and so a refresh re-renders the receipt
 * instead of resubmitting anything.
 *
 * The order number rides in the query rather than being re-fetched: it is the one
 * thing the visitor may need to quote to support, and it has to survive a refresh
 * even if the orders endpoint is briefly unavailable.
 */
export default async function BookingConfirmedPage({ searchParams }) {
  const query = await searchParams;
  const orderNumber = typeof query?.order === 'string' ? query.order : '';

  return (
    <section className="booking-done-sec">
      <div className="container">
        <div className="booking-done">
          {/* Inline rather than an `icon-*` class: the handover font has no tick
              glyph, and this is the one mark on the page that has to be exact. */}
          <span className="booking-done-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" role="presentation" focusable="false">
              <path
                d="M5 12.5 10 17.5 19 7.5"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>

          <p className="booking-done-eyebrow">Payment successful</p>
          <h1 className="booking-done-title">Your booking is confirmed!</h1>
          <p className="booking-done-note">
            Thank you for booking with Legally. Your payment has been received successfully and your
            reservation is now confirmed.
          </p>

          {orderNumber ? (
            <p className="booking-done-order">
              Order number <strong>{orderNumber}</strong>
            </p>
          ) : null}

          <div className="booking-done-actions">
            <Link className="btn btn-primary" href="/my-account?tab=my-bookings">
              View my bookings
            </Link>
            <Link className="btn btn-outline" href="/">
              Keep browsing
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
