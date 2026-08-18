import { notFound } from "next/navigation";
import ActiveCategoryPublisher from "@/components/rental/ActiveCategoryPublisher";
import ServiceDetails from "@/components/rental/ServiceDetails";
import { getServiceDetails } from "@/actions/getServiceDetails";
import { formatPrice, stripHtml } from "@/utils/formats";
import { CURRENCY_SYMBOL } from "@/lib/constants";

/**
 * `getServiceDetails` is `cache()`d, so this and the page body below share a
 * single API request rather than fetching the listing twice.
 */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { service } = await getServiceDetails(slug);

  if (!service) return { title: "Listing not found" };

  const price = formatPrice(service.amount);
  const description =
    stripHtml(service.description).trim().slice(0, 155) ||
    `Rent ${service.name}${service.location ? ` in ${service.location}` : ""} from ${CURRENCY_SYMBOL} ${price.formatted}.`;

  return {
    title: service.name,
    description,
    alternates: { canonical: `/rental/${service.slug || slug}` },
    openGraph: {
      title: service.name,
      description,
      images: service.images.slice(0, 1),
    },
  };
}

export default async function RentalDetailsPage({ params }) {
  const { slug } = await params;
  // Public: a guest sees the whole listing. The sign-in is asked for at
  // checkout, where it is actually needed, rather than at the front door.
  const { service } = await getServiceDetails(slug);

  if (!service) notFound();

  return (
    <>
      {/* The id when the slug is absent — this endpoint sends only the former,
          and `findCategory` resolves either. */}
      <ActiveCategoryPublisher
        categorySlug={service.categorySlug || service.categoryId}
        rentalType={service.rentalType}
      />
      <ServiceDetails service={service} />
    </>
  );
}
