import ProductBox from '@/components/theme/ProductBox';
import EmptyState from '@/components/theme/EmptyState';

/**
 * Wrapping grid of listings — listing pages, search results, wishlist page.
 * Same `<ProductBox />` as the rails, different layout container.
 *
 * @param {object} props
 * @param {Array<object>} props.products
 * @param {number} [props.columns=4] Cards per row from the `xl` breakpoint up.
 * @param {string} [props.emptyTitle]   Headline for the empty state.
 * @param {string} [props.emptyMessage] The line under it — what to try next.
 * @param {boolean} [props.showListed]
 * @param {boolean} [props.showWishlist]
 * @param {(product: object, next: boolean) => Promise<void>|void} [props.onWishlistToggle]
 *        Only pass from a client component; server components cannot serialise a function.
 *        Omit it and each card falls back to `useWishlistToggle`.
 */
export default function ProductGrid({
  products,
  columns = 4,
  emptyTitle,
  emptyMessage = 'Try changing or removing some of your filters, or adjusting your search area.',
  showListed = false,
  showWishlist = true,
  onWishlistToggle,
}) {
  if (!Array.isArray(products) || products.length === 0) {
    // `no-records` rather than `.empty-state`: this one stands in for a whole
    // grid, so it is styled as a block of its own rather than an inline note.
    return <EmptyState className="no-records" title={emptyTitle} message={emptyMessage} />;
  }

  // Derive every breakpoint from `columns` so a 2-up grid (the map layout) does
  // not silently become 3-up at `lg`, which was too tight beside the map.
  const target = Math.max(1, Math.min(6, columns));
  const span = (perRow) => Math.floor(12 / Math.max(1, Math.min(target, perRow)));
  const colClass = [
    "col-12",
    `col-sm-${span(2)}`,
    `col-lg-${span(3)}`,
    `col-xl-${span(target)}`,
  ].join(" ");

  return (
    <div className="product-row row">
      {products.map((product, index) => (
        <div className={`product-col ${colClass}`} key={`${product.id}-${index}`}>
          <ProductBox
            product={product}
            showListed={showListed}
            showWishlist={showWishlist}
            priority={index < 4}
            onWishlistToggle={onWishlistToggle}
          />
        </div>
      ))}
    </div>
  );
}
