import { notFound } from 'next/navigation';
import CheckoutFlow from '@/components/rental/CheckoutFlow';
import { getServiceDetails } from '@/actions/getServiceDetails';
import { readBookingSelection, toSearchParams } from '@/lib/bookingParams';

export const metadata = {
  title: 'Confirm and pay',
  // A half-finished booking is nobody's landing page.
  robots: { index: false, follow: false },
};

/**
 * `/rental/<slug>/checkout?from=&to=&guests=`
 *
 * The selection travels in the URL rather than in a store: it survives the
 * sign-in round trip the first step may force, it is shareable, and a refresh
 * mid-checkout keeps the dates the visitor picked. The listing itself is
 * re-fetched here rather than passed along, so the price shown at payment is the
 * live one and not whatever the details page held a few minutes ago.
 */
export default async function CheckoutPage({ params, searchParams }) {
  const { slug } = await params;
  const query = await searchParams;

  // A guest reaches this page and signs in at step 1, keeping their dates and
  // party on screen the whole way — bouncing them to `/login` first would show a
  // sign-in wall in place of the booking they are part-way through.
  const { service } = await getServiceDetails(slug);

  if (!service) notFound();

  // Same keys the listing page writes into its own address bar, read through the
  // same helper, so Reserve cannot hand over a selection this page misreads.
  const { dates, party, hours } = readBookingSelection(toSearchParams(query));

  return (
    <CheckoutFlow
      service={service}
      from={dates.from}
      to={dates.to}
      party={party}
      hours={hours}
    />
  );
}
