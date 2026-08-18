'use client';

import { useState, useCallback, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { formatPeriod, formatPrice, formatRating } from '@/utils/formats';
import useWishlistToggle from '@/hooks/useWishlistToggle';

/**
 * A URL string, not a static import.
 *
 * Anything under `public/` is already served at its own path, so importing it
 * through the bundler emits a *second* hashed copy into `_next/static/media` and
 * ships the same file twice. A static import would earn that cost back by
 * supplying `width`/`height` and a free `blurDataURL` — but both dimensions are
 * given explicitly below and no `<Image>` here uses `placeholder="blur"`, so
 * there is nothing to earn. If blur-up is ever wanted, move the file out of
 * `public/` (say `src/assets/`) and import it from there.
 */
const PLACEHOLDER_IMG = '/images/placeholder.jpg';

const IMAGE_SIZES =
  '(max-width: 575px) 90vw, (max-width: 991px) 45vw, (max-width: 1399px) 33vw, 20vw';

/**
 * Single reusable listing card — used by every product rail/grid on the site.
 *
 * @param {object} props
 * @param {import('@/utils/mappers').ProductViewModel} props.product Normalised listing.
 * @param {boolean} [props.showWishlist=true]
 * @param {boolean} [props.showListed=false]  Renders the "Listed" badge (seller views).
 * @param {boolean} [props.priority=false]    Set on above-the-fold cards only.
 * @param {(product: object, next: boolean) => Promise<void>|void} [props.onWishlistToggle]
 *        Overrides the default `useWishlistToggle` handler — pass one when the
 *        surrounding list needs to react (e.g. the wishlist tab removing a row).
 *        Throw/reject to roll the optimistic heart back.
 */
function ProductBox({
  product,
  showWishlist = true,
  showListed = false,
  priority = false,
  onWishlistToggle,
}) {
  const [isFavorite, setIsFavorite] = useState(Boolean(product?.isFavorite));
  // `''` means "no photo" — the box renders without one rather than framing a
  // stand-in. A URL that 404s is cleared on error and lands in the same state.
  const [imageSrc, setImageSrc] = useState(product?.image || '');
  const [isPending, setIsPending] = useState(false);

  // Rails and grids are rendered by server components, which cannot hand a
  // function across the boundary — so each card wires up its own handler.
  const defaultToggle = useWishlistToggle();
  const toggle = onWishlistToggle ?? defaultToggle;

  const handleWishlist = useCallback(
    async (event) => {
      // The card-wide stretched link sits underneath; don't let the click bubble to it.
      event.stopPropagation();
      event.preventDefault();
      if (isPending) return;

      const next = !isFavorite;
      setIsFavorite(next);
      setIsPending(true);

      try {
        await toggle(product, next);
      } catch {
        setIsFavorite(!next);
      } finally {
        setIsPending(false);
      }
    },
    [isFavorite, isPending, toggle, product],
  );

  if (!product) return null;

  const price = formatPrice(product.amount);
  const hasPrice = Number.parseFloat(price.base) > 0;
  const rating = formatRating(product.rating);

  return (
    <div className="product-card">
      <div className="product-card-img-box">
        <Image
          className="product-card-img"
          src={imageSrc || PLACEHOLDER_IMG}
          alt={product.name}
          width={400}
          height={300}
          sizes={IMAGE_SIZES}
          priority={priority}
          loading={priority ? undefined : 'lazy'}
          onError={() => setImageSrc('')}
        />

        {/* Kept outside the card link: a <button> inside an <a> is invalid and untabbable. */}
        {showWishlist ? (
          <button
            type="button"
            className={`product-card-whishlist${isPending ? ' is-pending' : ''}`}
            onClick={handleWishlist}
            disabled={isPending}
            aria-pressed={isFavorite}
            aria-label={
              isFavorite
                ? `Remove ${product.name} from wishlist`
                : `Add ${product.name} to wishlist`
            }
          >
            <i
              className={`icon ${isFavorite ? 'icon-wishlist-fill' : 'icon-wishlist'}`}
              aria-hidden="true"
            />
          </button>
        ) : null}

        {showListed ? (
          <div className="product-card-listed">
            <i className="icon icon-listed" aria-hidden="true" /> Listed
          </div>
        ) : null}
      </div>

      <div className="product-card-content">
        <div className="product-card-top d-flex justify-content-between">
          <h4 className="product-card-title">
            {/* stretched-link makes the whole card clickable without nesting controls. */}
            <Link className="product-card-link stretched-link" href={product.href}>
              {product.name}
            </Link>
          </h4>
          {rating ? (
            <div className="product-card-rating">
              <i className="icon icon-star" aria-hidden="true" /> {rating}
              {product.ratingCount > 0 ? <span>({product.ratingCount})</span> : null}
            </div>
          ) : null}
        </div>

        {product.location ? (
          <div className="product-card-location">
            <i className="icon icon-map" aria-hidden="true" />
            {product.location}
          </div>
        ) : null}

        {/* Vehicle: fuel, transmission, seats. Property/Halls: rooms, baths,
            area. Empty for every other type, and for a listing whose owner left
            the fields blank — so the row is conditional, not a run of dashes. */}
        {product.highlights?.length ? (
          <ul className="product-card-specs">
            {product.highlights.map((spec) => (
              <li key={spec.label}>
                {/* `icon` is optional on a highlight — a bare `.icon` class
                    would paint an empty block rather than nothing. */}
                {spec.icon ? <i className={`icon ${spec.icon}`} aria-hidden="true" /> : null}
                {spec.label}
              </li>
            ))}
          </ul>
        ) : null}

        {hasPrice ? (
          <div className="product-card-price">
            {CURRENCY_SYMBOL} {price.formatted}{' '}
            {product.periodType ? <small>{formatPeriod(product.periodType)}</small> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default memo(ProductBox);
