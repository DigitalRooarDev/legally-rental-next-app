'use client';

import Image from 'next/image';
import { summariseParty } from '@/components/rental/BookingGuestPicker';
import { HoursStepper } from '@/components/rental/BookingHoursPicker';
import { describeCancellationPolicy } from '@/lib/cancellationPolicy';
import { CANCELLATION_POLICY_PATH, CURRENCY_SYMBOL } from '@/lib/constants';
import { formatRating } from '@/utils/formats';

const money = (value) =>
  `${CURRENCY_SYMBOL}${Number(value).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/**
 * The listing/price panel that stays beside every checkout step.
 *
 * Takes the already-computed `quote` rather than the raw listing: the totals are
 * derived once in `<CheckoutFlow>` and shown here, so the number on this card
 * and the number sent to `createOrder` cannot diverge.
 *
 * @param {object} props
 * @param {import('@/utils/mappers').ServiceDetailViewModel} props.service
 * @param {object} props.quote  From `buildQuote` — nights, sections, total.
 * @param {object} props.party    Adults/children/infants/pets — stays only.
 * @param {boolean} props.takesGuests  Whether a guest party applies at all.
 * @param {string} props.dateLabel  "21–23 Aug 2026", or `''` when unchosen.
 * @param {number} [props.hours]    Hourly listings only; its own row with a stepper.
 * @param {() => void} props.onEditDates
 * @param {(next: number) => void} [props.onHoursChange]  Applied on each tap.
 * @param {() => void} props.onEditGuests
 * @param {boolean} [props.isPricing]  A re-quote is in flight.
 * @param {boolean} [props.isEstimate] These are the app's figures, not the API's.
 */
export default function CheckoutSummary({
  service,
  quote,
  party,
  takesGuests,
  dateLabel,
  hours = 0,
  onEditDates,
  onHoursChange,
  onEditGuests,
  isPricing = false,
  isEstimate = false,
}) {
  const rating = formatRating(service.rating);
  const policy = describeCancellationPolicy(service.cancellationPolicy);

  return (
    <aside className="checkout-summary">
      <div className="checkout-summary-head">
        {service.images?.[0] ? (
          <Image
            className="checkout-summary-img"
            src={service.images[0]}
            alt=""
            width={96}
            height={76}
          />
        ) : null}
        <div>
          <strong className="checkout-summary-name">{service.name}</strong>
          {service.location ? (
            <span className="checkout-summary-location">
              <i className="icon icon-map" aria-hidden="true" />
              {service.location}
            </span>
          ) : null}
          {rating ? (
            <span className="checkout-summary-rating">
              <i className="icon icon-star" aria-hidden="true" /> {rating}
              {service.ratingCount > 0 ? <small>({service.ratingCount})</small> : null}
            </span>
          ) : null}
        </div>
      </div>

      {policy.label ? (
        <p className="checkout-summary-policy">
          {/* Same words, same order as the detail page's card — the two screens are
              seen back to back, and this one is where the money is committed. */}
          {policy.label} cancellation policy.{policy.summary ? ` ${policy.summary}` : ''}{' '}
          {/* A new tab: leaving the checkout would cost a part-filled payment form. */}
          <a href={CANCELLATION_POLICY_PATH} target="_blank" rel="noopener noreferrer">
            Full policy
          </a>
        </p>
      ) : null}

      <div className="checkout-summary-row">
        <div>
          <div className="checkout-summary-label">Dates</div>
          <div className="checkout-summary-content">
            {dateLabel || 'Not selected'}
            {service.booking?.checkIn ? (
              <div>
                {service.booking.checkIn} – {service.booking.checkOut} check-in
              </div>
            ) : null}
          </div>
        </div>
        <button type="button" className="checkout-summary-edit" onClick={onEditDates}>
          Edit
        </button>
      </div>

      {/* Its own row, under the dates, for the same reason Guests gets one: on an
          hourly listing the length *is* the hour count, so it is a separate choice
          the visitor has to be able to change here — not a suffix on the date.
          The stepper sits where the other rows keep Edit: there is one number to
          set, so a dialog would be two clicks and a Save for a single tap. */}
      {service.isHourly ? (
        <div className="checkout-summary-row">
          <div>
            <div className="checkout-summary-label">Hours</div>
            <div className="checkout-summary-content">
              {hours} hour{hours === 1 ? '' : 's'}
            </div>
          </div>
          <HoursStepper value={hours} onChange={onHoursChange} />
        </div>
      ) : null}

      {/* A vehicle or a dress has no party, so the row is omitted rather than
          shown as "1 guest". */}
      {takesGuests ? (
        <div className="checkout-summary-row">
          <div>
            <div className="checkout-summary-label">Guests</div>
            <div className="checkout-summary-content">{summariseParty(party)}</div>
          </div>
          <button type="button" className="checkout-summary-edit" onClick={onEditGuests}>
            Edit
          </button>
        </div>
      ) : null}

      <div className={`checkout-summary-prices ${isPricing ? 'is-pricing' : ''}`}>
        <div className="checkout-summary-label">Price details</div>
        {/* Grouped — the rental block, then Fees, then Discounts — and the same
            groups the booking detail page shows, so the breakdown a visitor
            approves here is the one they get back on the receipt. Sections with
            nothing to show are already dropped by `buildPriceBreakdown`, which is
            why the heading can be rendered unconditionally. */}
        {quote.sections.map((section) => (
          <div className="checkout-summary-content" key={section.key}>
            {section.title ? (
              <div className="checkout-summary-section-title">{section.title}</div>
            ) : null}
            <ul>
              {section.lines.map((line) => (
                <li key={line.key} className={line.key}>
                  <span>
                    {line.label}
                    {line.note ? <small className="charge-note"> {line.note}</small> : null}
                  </span>
                  {/* The class goes on the amount, not the row: it is the figure
                      that reads as a credit. */}
                  <span
                    className={`checkout-summary-amount ${line.isCredit ? 'charge-credit' : ''}`}
                  >
                    {line.isCredit ? '−' : ''}
                    {money(line.amount)}
                  </span>
                  {line.sublines?.length ? (
                    <ul className="checkout-summary-sublines">
                      {line.sublines.map((subline) => (
                        <li key={subline.key}>
                          <span>{subline.label}</span>
                          <span className="checkout-summary-amount">{money(subline.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="checkout-summary-total">
          <strong>Total Price (NGN)</strong>
          <strong>{money(quote.total)}</strong>
        </div>

        <p className="checkout-summary-muted">
          {[
            quote.lengthLabel ? `For ${quote.lengthLabel}` : '',
            takesGuests && quote.guests > 0
              ? `for ${quote.guests} guest${quote.guests === 1 ? '' : 's'}`
              : '',
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>

        {quote.refundable > 0 ? (
          <p className="checkout-summary-muted">
            Includes {money(quote.refundable)} refundable deposit.
          </p>
        ) : null}

        {/* Said plainly rather than shown as a final figure: until the visitor
            signs in the API will not price the booking, so this is the app's own
            arithmetic and excludes the service fee and VAT. */}
        {isEstimate ? (
          <p className="checkout-summary-estimate">
            Estimated total. Sign in to see the final price including fees and VAT.
          </p>
        ) : null}
      </div>
    </aside>
  );
}
