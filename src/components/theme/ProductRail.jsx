'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ProductBox from '@/components/theme/ProductBox';

const SCROLL_EPSILON = 2; // sub-pixel scroll widths would otherwise never hit the end state.

/**
 * Horizontal product rail: section heading, prev/next controls and N `<ProductBox />`.
 *
 * @param {object} props
 * @param {string} props.title
 * @param {Array<object>} props.products Normalised listings.
 * @param {string} [props.viewAllHref]   Renders the arrow link next to the title.
 * @param {boolean} [props.showListed]
 * @param {boolean} [props.showWishlist]
 * @param {boolean} [props.priority]     Pass on the first rail only (LCP).
 * @param {string}  [props.className]    Extra classes on the <section>.
 * @param {(product: object, next: boolean) => Promise<void>|void} [props.onWishlistToggle]
 */
export default function ProductRail({
  title,
  products,
  viewAllHref,
  showListed = false,
  showWishlist = true,
  priority = false,
  className = '',
  onWishlistToggle,
}) {
  const trackRef = useRef(null);
  const [scrollState, setScrollState] = useState({ atStart: true, atEnd: true });

  const syncScrollState = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const maxScroll = track.scrollWidth - track.clientWidth;
    setScrollState({
      atStart: track.scrollLeft <= SCROLL_EPSILON,
      atEnd: maxScroll <= SCROLL_EPSILON || track.scrollLeft >= maxScroll - SCROLL_EPSILON,
    });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    syncScrollState();
    const observer = new ResizeObserver(syncScrollState);
    observer.observe(track);

    return () => observer.disconnect();
  }, [syncScrollState, products]);

  const scrollByCard = useCallback((direction) => {
    const track = trackRef.current;
    if (!track) return;

    const card = track.firstElementChild;
    const step = card ? card.getBoundingClientRect().width : track.clientWidth / 2;
    track.scrollBy({ left: step * direction, behavior: 'smooth' });
  }, []);

  if (!Array.isArray(products) || products.length === 0) return null;

  const navDisabled = scrollState.atStart && scrollState.atEnd;

  return (
    <section className={`product-section ${className}`.trim()}>
      <div className="container">
        <div className="product-head d-flex justify-content-between align-items-center">
          <div className="product-title">
            <h2 className="section-title d-flex align-items-center">
              {title}
              {viewAllHref ? (
                <Link className="section-title-link" href={viewAllHref} aria-label={`View all ${title}`}>
                  <i className="icon icon-arrow-right" aria-hidden="true" />
                </Link>
              ) : null}
            </h2>
          </div>

          {!navDisabled ? (
            <div className="product-nav">
              <button
                type="button"
                className="product-arrow prev-btn"
                onClick={() => scrollByCard(-1)}
                disabled={scrollState.atStart}
                aria-label={`Previous ${title}`}
              >
                <i className="icon icon-chevron-left" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="product-arrow next-btn"
                onClick={() => scrollByCard(1)}
                disabled={scrollState.atEnd}
                aria-label={`Next ${title}`}
              >
                <i className="icon icon-chevron-right" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>

        <div className="product-row product-row--rail row" ref={trackRef} onScroll={syncScrollState}>
          {products.map((product, index) => (
            <div className="product-col col" key={`${product.id}-${index}`}>
              <ProductBox
                product={product}
                showListed={showListed}
                showWishlist={showWishlist}
                priority={priority && index < 2}
                onWishlistToggle={onWishlistToggle}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
