'use client';

import { SERVICE_REVIEWS_ANCHOR } from '@/lib/constants';

/**
 * The review count beside a listing's rating, as a link down to the reviews.
 *
 * A real `<a href="#...">`, so it works before hydration and keeps its
 * middle-click and right-click menu. The handler only exists to smooth the jump:
 * `style.css` sets `html { scroll-behavior: auto !important }`, which a hash
 * navigation cannot opt out of — `scrollIntoView` can.
 *
 * @param {object} props
 * @param {number} props.count
 * @param {string} [props.targetId]
 */
export default function ReviewsScrollLink({ count, targetId = SERVICE_REVIEWS_ANCHOR }) {
  const handleClick = (event) => {
    const target = document.getElementById(targetId);

    // Nothing to scroll to — let the browser handle the href as it would.
    if (!target) return;

    event.preventDefault();

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });

    // Without this the next Tab resumes from the top of the page, which is not
    // where the visitor is now looking.
    target.focus({ preventScroll: true });
  };

  return (
    <a className="service-details-reviews-link" href={`#${targetId}`} onClick={handleClick}>
      {count} Review{count === 1 ? '' : 's'}
    </a>
  );
}
