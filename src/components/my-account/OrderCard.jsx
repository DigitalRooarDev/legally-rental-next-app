import Image from "next/image";
import Link from "next/link";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { formatBookingRange, formatDate, formatPeriod, formatPrice } from "@/utils/formats";

/**
 * One rental booking.
 *
 * A rental order is a single service over a date range — not a basket of line
 * items — so the card is flat: listing, dates, duration, totals, seller.
 *
 * @param {object} props
 * @param {import('@/utils/mappers').OrderViewModel} props.order
 */
export default function OrderCard({ order }) {
  const total = formatPrice(order.grandTotal);
  const deposit = formatPrice(order.depositAmount);
  const hasDeposit = Number.parseFloat(deposit.base) > 0;

  const duration =
    order.bookingDays > 0
      ? `${order.bookingDays} ${order.bookingDays === 1 ? "day" : "days"}`
      : order.nights > 0
        ? `${order.nights} ${order.nights === 1 ? "night" : "nights"}`
        : "";

  return (
    <article className="order-card">
      <div className="order-card-head">
        <div>
          <Link className="order-card-number" href={`/my-account/booking/${order.id}`}>
            {order.orderNumber}
          </Link>
          {order.placedAt ? (
            <span className="order-card-placed">Placed {formatDate(order.placedAt)}</span>
          ) : null}
        </div>
        <span className={`order-status order-status--${order.statusTone}`}>{order.statusLabel}</span>
      </div>

      <div className="order-card-body">
        {order.image ? (
          <div className="order-card-img">
            <Image
              src={order.image}
              alt={order.serviceName}
              width={140}
              height={105}
              sizes="140px"
              loading="lazy"
            />
          </div>
        ) : null}

        <div className="order-card-info">
          <h3 className="order-card-title">
            {order.serviceId ? (
              <Link href={`/rental/${order.serviceId}`}>{order.serviceName}</Link>
            ) : (
              order.serviceName
            )}
          </h3>

          <ul className="order-card-meta">
            {order.categoryName ? <li>{order.categoryName}</li> : null}
            {order.bookingFrom ? <li>{formatBookingRange(order.bookingFrom, order.bookingTo)}</li> : null}
            {duration ? <li>{duration}</li> : null}
          </ul>

          {order.seller?.name ? (
            <div className="order-card-seller">
              Hosted by <strong>{order.seller.name}</strong>
            </div>
          ) : null}
        </div>

        <div className="order-card-totals">
          <div className="order-card-total">
            {CURRENCY_SYMBOL} {total.formatted}
            {order.periodType ? <small>{formatPeriod(order.periodType)}</small> : null}
          </div>
          {hasDeposit ? (
            <div className="order-card-deposit">
              Deposit {CURRENCY_SYMBOL} {deposit.formatted}
            </div>
          ) : null}
          <Link className="btn btn-label order-card-link" href={`/my-account/booking/${order.id}`}>
            View details
          </Link>
        </div>
      </div>
    </article>
  );
}
