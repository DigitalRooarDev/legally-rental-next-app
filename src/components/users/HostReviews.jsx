'use client';

import { useState } from 'react';
import HostReview from '@/components/users/HostReview';
import EmptyState from '@/components/theme/EmptyState';
import { getBuyerReviews } from '@/actions/getBuyerReviews';
import { REVIEWS_PER_PAGE } from '@/lib/constants';

/**
 * Flattens the loaded batches into the list to render, dropping any review id
 * already shown.
 *
 * The dedupe is defensive, not decorative: `buyerReviewList` pages by offset over
 * a list that is still being written to, so a review left between two requests
 * shifts everything down one and the batch that follows repeats a card. Repeated
 * ids also collide as React keys, which is the louder failure of the two.
 */
const flatten = (batches) => {
  const seen = new Set();

  return batches.flat().filter((review) => {
    if (seen.has(review.id)) return false;
    seen.add(review.id);
    return true;
  });
};

/**
 * The reviews hosts left about a member.
 *
 * The grid only ever **grows**: "View next N" appends the next batch under the
 * cards already there, so nothing a visitor has read scrolls away to make room.
 * One control does it, at the bottom, where the list runs out.
 *
 * The first batch is the slice already inlined in the profile response, so the
 * first paint costs no request and the server-rendered markup is what the visitor
 * sees. Later batches come from `buyerReviewList`.
 *
 * @param {object} props
 * @param {string} props.buyerId
 * @param {string} props.name  Whose profile this is; used in the copy.
 * @param {import('@/utils/mappers').BuyerReview[]} props.initialReviews
 *   `what_hosts_are_saying` in full — sliced to the first batch here.
 * @param {number} props.total  The API's review count, which can exceed
 *   `initialReviews.length`; that is what there is to load.
 */
export default function HostReviews({ buyerId, name, initialReviews, total }) {
  /**
   * Every batch loaded so far, in order — index 0 is the first.
   *
   * This assumes `what_hosts_are_saying` is the head of the same list
   * `buyerReviewList` pages through, which is what both endpoints return today.
   */
  const [batches, setBatches] = useState(() => [initialReviews.slice(0, REVIEWS_PER_PAGE)]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Trust the larger of the two counts: a payload whose `reviews` field lags the
   * array it ships alongside would otherwise hide reviews already on the page.
   */
  const [count, setCount] = useState(() => Math.max(Number(total) || 0, initialReviews.length));

  const visible = flatten(batches);
  const remaining = Math.max(0, count - visible.length);
  const nextCount = Math.min(REVIEWS_PER_PAGE, remaining);

  const showMore = async () => {
    if (isLoading || remaining === 0) return;

    setError('');
    setIsLoading(true);
    const result = await getBuyerReviews({ buyerId, page: batches.length + 1 });
    setIsLoading(false);

    // An empty batch is treated as a failure: the button only offered it because
    // a count said it was there, so appending nothing would look like a dead click.
    if (!result.status || result.reviews.length === 0) {
      setError(result.message || 'Unable to load more reviews right now.');
      return;
    }

    setBatches((current) => [...current, result.reviews]);
    // The list endpoint is the authority on how many there are; the profile's
    // count only seeded the button until the first request came back.
    if (result.pagination.total > 0) setCount(result.pagination.total);
  };

  const head = (
    <div className="user-reviews-head">
      <div className="user-reviews-heading">
        <h2 className="user-reviews-title">What hosts are saying about {name}</h2>
        <p>Feedback from hosts who have hosted {name}</p>
      </div>

      {/* Announced as the grid grows — otherwise nothing says how much is left. */}
      {count > visible.length || batches.length > 1 ? (
        <p className="host-reviews-count" aria-live="polite">
          Showing {visible.length} of {count} reviews
        </p>
      ) : null}
    </div>
  );

  if (initialReviews.length === 0) {
    return (
      <>
        {head}
        <EmptyState
          message={`${name} hasn't been reviewed by a host yet.`}
          className="empty-state"
        />
      </>
    );
  }

  return (
    <>
      {head}

      {/* Not dimmed while a batch is in flight: the cards already here stay
          readable, and it is the button that says something is loading. */}
      <div className="row user-reviews-grid" aria-busy={isLoading}>
        {visible.map((review) => (
          <div className="col-md-4" key={review.id}>
            <HostReview review={review} />
          </div>
        ))}
      </div>

      {error ? (
        <p className="host-reviews-error" role="alert">
          {error}
        </p>
      ) : null}

      {remaining > 0 ? (
        <div className="host-reviews-foot">
          <button
            type="button"
            className="btn btn-outline all-reviews-btn"
            onClick={showMore}
            disabled={isLoading}
          >
            {isLoading ? 'Loading…' : `View next ${nextCount} review${nextCount === 1 ? '' : 's'}`}
            <i className="icon icon-arrow-right" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </>
  );
}
