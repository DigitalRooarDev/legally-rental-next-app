import ProductRail from '@/components/theme/ProductRail';
import EmptyState from '@/components/theme/EmptyState';

/**
 * Home page body: the dashboard sections rendered as horizontal rails.
 *
 * The rail list is data-driven so an empty section simply drops out instead of
 * leaving an empty heading behind.
 *
 * @param {object} props
 * @param {object} props.data  Return value of `getBuyerDashboard().data`.
 * @param {string|null} [props.error]
 */
export default function Home({ data, error = null }) {
  const rails = [
    { key: 'top', title: 'Most Popular', products: data.topServices, priority: true },
    {
      key: 'property',
      title: 'Property Rentals',
      products: data.properties,
      viewAllHref: '/search?category=property',
    },
    {
      key: 'vehicle',
      title: 'Vehicle Rentals',
      products: data.vehicles,
      viewAllHref: '/search?category=vehicle',
    },
    {
      key: 'wishlist',
      title: 'Rentals you may like',
      products: data.wishlist,
      viewAllHref: '/my-account?tab=my-wishlist',
    },
    {
      key: 'nearby',
      title: data.nearby.city ? `Nearby in ${data.nearby.city}` : 'Nearby',
      products: data.nearby.items,
      viewAllHref: '/search?nearby=1',
    },
  ].filter((rail) => rail.products.length > 0);

  return (
    <>
      {error ? (
        <div className="notice-bar">
          <div className="container">
            Live listings are temporarily unavailable. Please try again shortly.
          </div>
        </div>
      ) : null}

      {rails.length > 0 ? (
        rails.map((rail, index) => (
          <ProductRail
            key={rail.key}
            title={rail.title}
            products={rail.products}
            viewAllHref={rail.viewAllHref}
            priority={Boolean(rail.priority)}
            className={index === 0 ? '' : 'pt-0'}
          />
        ))
      ) : (
        <div className="container">
          <EmptyState
            title="No listings yet"
            message="We could not find any rentals to show right now. Please check back soon."
          />
        </div>
      )}
    </>
  );
}
