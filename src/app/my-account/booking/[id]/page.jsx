import Link from "next/link";
import { notFound } from "next/navigation";
import OrderDetails from "@/components/my-account/OrderDetails";
import { getOrderDetails } from "@/actions/getOrderDetails";
import { getOrderTimeline } from "@/actions/getOrderTimeline";

/** `getOrderDetails` is `cache()`d, so this shares one request with the page body. */
export async function generateMetadata({ params }) {
  const { id } = await params;
  const { order } = await getOrderDetails(id);

  return {
    title: order ? `Booking ${order.orderNumber}` : "Booking not found",
    robots: { index: false },
  };
}

export default async function BookingDetailPage({ params }) {
  const { id } = await params;

  /**
   * Two endpoints, one round trip. `orderTimeline` is a separate call and neither
   * result depends on the other, so awaiting them in sequence would add its
   * latency to the page for nothing.
   */
  const [{ order, message }, timeline] = await Promise.all([
    getOrderDetails(id),
    getOrderTimeline(id),
  ]);

  // `proxy.js` already gates /my-account, but a session can expire mid-visit.
  if (message === "Not signed in.") {
    return (
      <section className="container">
        <div className="empty-state text-center">
          <h5>Sign in to view this booking</h5>
          <Link className="btn btn-primary mt-3" href={`/login?redirect=/my-account/booking/${id}`}>
            Sign in
          </Link>
        </div>
      </section>
    );
  }

  if (!order) notFound();

  return <OrderDetails order={order} timeline={timeline} />;
}
