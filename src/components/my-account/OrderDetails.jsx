import Image from 'next/image';
import Link from 'next/link';
import TimelineAttachments from '@/components/my-account/TimelineAttachments';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import {
  formatBookingRange,
  formatDate,
  formatDateTime,
  formatPeriod,
  formatPrice,
  formatRating,
} from '@/utils/formats';

const Money = ({ value }) => (
  <>
    {CURRENCY_SYMBOL} {formatPrice(value).formatted}
  </>
);

/**
 * One booking in full: status, dates, guests, price breakdown, host, listing
 * attributes. Rendered by `/my-account/booking/[id]`.
 *
 * @param {object} props
 * @param {object} props.order From `toOrderDetailViewModel`.
 * @param {Array<object>} [props.timeline]
 *   From `getOrderTimeline` — a separate endpoint, so a separate prop. Empty when
 *   the history could not be loaded, which drops the block rather than failing the
 *   page: the dates, the price and the host are all still worth reading.
 */
export default function OrderDetails({ order, timeline = [] }) {
  const deposit = formatPrice(order.depositAmount);
  const hasDeposit = Number.parseFloat(deposit.base) > 0;

  const guestParts = [
    order.guests.adults ? `${order.guests.adults} adults` : '',
    order.guests.children ? `${order.guests.children} children` : '',
    order.guests.infants ? `${order.guests.infants} infants` : '',
    order.guests.pets ? `${order.guests.pets} pets` : '',
  ].filter(Boolean);

  // Whichever terminal state applies — at most one is populated.
  const outcome =
    (order.rejectedReason && {
      label: 'Rejected',
      date: order.rejectedDate,
      note: order.rejectedReason,
    }) ||
    (order.cancelledDate && { label: 'Cancelled', date: order.cancelledDate, note: '' }) ||
    (order.completedDate && { label: 'Completed', date: order.completedDate, note: '' }) ||
    (order.deliveredDate && { label: 'Delivered', date: order.deliveredDate, note: '' }) ||
    null;

  const listingHref = order.serviceId ? `/rental/${order.serviceId}` : '';

  return (
    /* The checkout's shell, classes and all. A booking *is* the checkout after the
       fact — same listing, same dates, same party, same price breakdown — so it
       reads as the same page rather than a second design for the same facts. The
       one structural difference: the checkout's summary panel carries the listing
       image, and here that block sits on the left, because the right column is a
       receipt rather than a thing being edited. */
    <section className="checkout-sec">
      <div className="container">
        <div className="checkout-head">
          <Link
            className="checkout-back"
            href="/my-account?tab=my-bookings"
            aria-label="Back to my bookings"
          >
            <i className="icon icon-chevron-left" aria-hidden="true" />
          </Link>
          <h1 className="checkout-title">{order.orderNumber}</h1>
          <span className={`order-status order-status--${order.statusTone}`}>
            {order.statusLabel}
          </span>
        </div>

        {order.placedAt ? (
          <p className="order-card-placed">Placed {formatDate(order.placedAt)}</p>
        ) : null}

        {outcome ? (
          <div className={`order-outcome order-outcome--${order.statusTone}`}>
            <strong>
              {outcome.label}
              {outcome.date ? ` on ${formatDate(outcome.date)}` : ''}
            </strong>
            {outcome.note ? <p>{outcome.note}</p> : null}
          </div>
        ) : null}

        <div className="row checkout-row">
          <div className="col-lg-7">
            {/* The checkout's summary head, on the left. */}
            <div className="checkout-step">
              <div className="checkout-summary-head">
                {order.image ? (
                  <Image
                    className="checkout-summary-img"
                    src={order.image}
                    alt=""
                    width={96}
                    height={76}
                  />
                ) : null}
                <div>
                  <strong className="checkout-summary-name">
                    {listingHref ? (
                      <Link href={listingHref}>{order.serviceName}</Link>
                    ) : (
                      order.serviceName
                    )}
                  </strong>
                  {order.location ? (
                    <span className="checkout-summary-location">
                      <i className="icon icon-map" aria-hidden="true" />
                      {order.location}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* <h2 className="service-block-title mb-3 mt-4">Booking</h2> */}
              <dl className="service-attributes gap-3 mt-4">
                {order.bookingFrom ? (
                  <div className="service-attribute d-block">
                    <dt>Dates</dt>
                    <dd>{formatBookingRange(order.bookingFrom, order.bookingTo)}</dd>
                  </div>
                ) : null}
                {order.bookingFromTime || order.bookingToTime ? (
                  <div className="service-attribute d-block">
                    <dt>Times:</dt>
                    <dd>
                      {[order.bookingFromTime, order.bookingToTime].filter(Boolean).join(' – ')}
                    </dd>
                  </div>
                ) : null}
                {order.bookingDays > 0 ? (
                  <div className="service-attribute d-block">
                    <dt>Duration</dt>
                    <dd>
                      {order.bookingDays} {order.bookingDays === 1 ? 'day' : 'days'}
                      {order.nights > 0 ? ` · ${order.nights} nights` : ''}
                      {order.hours > 0 ? ` · ${order.hours} hrs` : ''}
                    </dd>
                  </div>
                ) : null}
                {guestParts.length > 0 ? (
                  <div className="service-attribute d-block">
                    <dt>Guests</dt>
                    <dd>{guestParts.join(', ')}</dd>
                  </div>
                ) : null}
              </dl>
            </div>

            {timeline.length > 0 ? (
              <div className="checkout-step order-history-box">
                <div className="order-history-title">Order Tracking History</div>
                <div className="order-tracking">
                  <ul>
                    {timeline.map((entry, index) => (
                      <li key={entry.id} className={index === timeline.length - 1 ? 'active' : ''}>
                        <div className="icon-box">
                          <i className={`icon ${entry.icon}`} aria-hidden="true" />
                        </div>
                        <div className="content-box">
                          <div className="order-tracking-title">{entry.title}</div>
                          {entry.description ? <p>{entry.description}</p> : null}
                          {entry.at ? (
                            <span className="order-date">{formatDateTime(entry.at)}</span>
                          ) : null}
                          {entry.reason ? (
                            <div className="order-reason">
                              <b>Reason:</b> {entry.reason}
                            </div>
                          ) : null}
                          {entry.note ? (
                            <div className="order-reason">
                              <b>Note:</b> {entry.note}
                            </div>
                          ) : null}
                          <TimelineAttachments attachments={entry.attachments} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}

            {order.attributes.length > 0 ? (
              <div className="checkout-step">
                <h2 className="service-block-title mb-4">Listing details</h2>
                <dl className="service-attributes">
                  {order.attributes.map((attribute) => (
                    <div className="service-attribute" key={attribute.key}>
                      <span className="service-attr-icon">
                        <i className={`icon ${attribute.icon}`} aria-hidden="true" />
                      </span>
                      <div>
                        <dt>{attribute.label}</dt>
                        <dd>{attribute.value}</dd>
                      </div>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}

            {order.features.length > 0 ? (
              <div className="checkout-step">
                <h2 className="service-block-title mb-4">Included</h2>
                <ul className="service-features">
                  {order.features.map((feature, index) => (
                    <li key={`${feature.id || feature.name}-${index}`}>
                      {feature.imageURL ? (
                        <Image src={feature.imageURL} alt="" width={24} height={24} />
                      ) : null}
                      {feature.name}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {/* The checkout's summary panel, same classes — the figures are the same
              figures, so the breakdown a visitor approved at payment and the one
              they read back afterwards line up row for row. */}
          <div className="col-lg-5">
            <aside className="checkout-summary">
              <div className="checkout-summary-prices pt-0 border-top-0">
                <div className="checkout-summary-label">Price details</div>
                {/* The same grouped shape the checkout shows — rental block, then
                    Fees, then Discounts. A receipt itemised differently from the
                    screen the visitor approved gives them no way to reconcile the
                    two, so both render `buildPriceBreakdown`'s output verbatim. */}
                {order.charges.map((section) => (
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
                          {/* The class goes on the amount, not the row: it is the
                              figure that reads as a credit, and colouring the label
                              green with it would say the line item is one. */}
                          <span
                            className={`checkout-summary-amount ${line.isCredit ? 'charge-credit' : ''}`}
                          >
                            {line.isCredit ? '−' : ''}
                            <Money value={line.amount} />
                          </span>
                          {line.sublines?.length ? (
                            <ul className="checkout-summary-sublines">
                              {line.sublines.map((subline) => (
                                <li key={subline.key}>
                                  <span>{subline.label}</span>
                                  <span className="checkout-summary-amount">
                                    <Money value={subline.amount} />
                                  </span>
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
                  <strong>Total paid</strong>
                  <strong>
                    <Money value={order.grandTotal} />
                  </strong>
                </div>

                {hasDeposit ? (
                  <p className="checkout-summary-muted">
                    Includes <Money value={order.depositAmount} /> refundable deposit.
                  </p>
                ) : null}
              </div>

              {order.paymentType ? (
                <p className="order-payment">
                  Paid with <strong>{order.paymentType}</strong>
                  {order.transactionNumber ? (
                    <>
                      <br />
                      <span className="order-txn">{order.transactionNumber}</span>
                    </>
                  ) : null}
                </p>
              ) : null}

              {order.seller ? (
                <div className="service-seller">
                  {order.seller.image ? (
                    <Image
                      className="service-seller-avatar"
                      src={order.seller.image}
                      alt=""
                      width={48}
                      height={48}
                    />
                  ) : null}
                  <div>
                    <div className="service-seller-name">{order.seller.name || 'Legally host'}</div>
                    {formatRating(order.seller.rating) ? (
                      <div className="service-seller-rating">
                        <i className="icon icon-star" aria-hidden="true" />{' '}
                        {formatRating(order.seller.rating)}
                        {order.seller.ratingCount > 0 ? (
                          <small> ({order.seller.ratingCount})</small>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
