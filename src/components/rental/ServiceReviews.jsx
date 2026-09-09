'use client';

import { useRef, useState } from 'react';
import HostReview from '@/components/users/HostReview';
import Pagination from '@/components/theme/Pagination';
import { getServiceReviews } from '@/actions/getServiceReviews';
import { SERVICE_REVIEWS_ANCHOR, SERVICE_REVIEWS_PER_PAGE } from '@/lib/constants';

/**
 * Fills in a pagination block the API left short.
 *
 * `reviewDetailsList` has been seen to answer with reviews and no `pagination`
 * at all; read literally that is a total of zero beneath six visible cards. The
 * cards on screen are the floor for both counts.
 */
const toSafePagination = (pagination, count) => ({
  currentPage: pagination?.currentPage || 1,
  lastPage: pagination?.lastPage || 1,
  perPage: pagination?.perPage || SERVICE_REVIEWS_PER_PAGE,
  total: Math.max(pagination?.total || 0, count),
});

/**
 * The reviews left on one listing.
 *
 * Reuses `<HostReview />` and the `.user-reviews-*` grid from the member profile
 * so a review reads identically wherever it appears — same card, same three-up
 * row, same breakdown of answered questions.
 *
 * Where it differs is the pager. The profile *grows* its grid, because a visitor
 * reading down a profile should not have what they just read scroll away. Here
 * the section is a scroll target: the rating at the top of the listing jumps to
 * it, so the heading has to stay put and the page has to replace its cards
 * rather than push everything down.
 *
 * Page one is server-rendered from the listing page's own request, so the first
 * paint costs no round trip and the cards are in the HTML for crawlers.
 *
 * @param {object} props
 * @param {string|number} props.serviceId  Numeric id — `reviewDetailsList` will not take the slug.
 * @param {import('@/utils/mappers').BuyerReview[]} props.initialReviews
 * @param {{currentPage: number, lastPage: number, perPage: number, total: number}} props.initialPagination
 */
export default function ServiceReviews({ serviceId, initialReviews, initialPagination }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [pagination, setPagination] = useState(() =>
    toSafePagination(initialPagination, initialReviews.length),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const sectionRef = useRef(null);

  /**
   * Sequence number of the latest request. Clicking through pages faster than
   * the API answers can land an earlier response last, which would leave the
   * grid showing a page the pager no longer highlights.
   */
  const requestRef = useRef(0);

  /**
   * Page shown, held here rather than read back from `pagination.currentPage`:
   * the pager has to highlight the page being loaded, and a payload whose
   * `current_page` disagrees with what was asked for must not move the
   * highlight under the visitor's cursor.
   */
  const [page, setPage] = useState(() => initialPagination?.currentPage || 1);

  const { perPage, total, lastPage } = pagination;
  const first = (page - 1) * perPage + 1;
  const last = Math.min(first + reviews.length - 1, total || first + reviews.length - 1);

  const changePage = async (next) => {
    if (next < 1 || next > lastPage || next === page) return;

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    // Where the highlight goes back to if the request fails. Read from state
    // rather than from `pagination`, whose `current_page` is the API's opinion.
    const previous = page;

    setPage(next);
    setError('');
    setIsLoading(true);

    const result = await getServiceReviews({ serviceId, page: next });

    // Superseded by a later click — its response is the one that counts.
    if (requestRef.current !== requestId) return;

    setIsLoading(false);

    // An empty page is treated as a failure: the pager only offered it because
    // `last_page` said it was there, so blanking the grid would read as a bug.
    if (!result.status || result.reviews.length === 0) {
      setPage(previous);
      setError(result.message || 'Unable to load these reviews right now.');
      return;
    }

    setReviews(result.reviews);
    setPagination(toSafePagination(result.pagination, result.reviews.length));

    // The cards were replaced, not appended: without this a visitor paging from
    // the bottom of the section is left staring at the pager of a new page.
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    sectionRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <section
      className="service-reviews"
      id={SERVICE_REVIEWS_ANCHOR}
      ref={sectionRef}
      /* The rating link moves focus here after scrolling, so a keyboard visitor
         carries on from the section rather than from the top of the page. */
      tabIndex={-1}
      aria-labelledby="service-reviews-title"
    >
      <div className="user-reviews-head">
        <div className="user-reviews-heading">
          <h2 className="user-reviews-title" id="service-reviews-title">
            Customer Reviews
          </h2>
          <p>Feedback from guests who booked this rental</p>
        </div>

        {total > 0 ? (
          <p className="host-reviews-count" aria-live="polite">
            {lastPage > 1 ? `Showing ${first}–${last} of ${total} reviews` : `${total} review${total === 1 ? '' : 's'}`}
          </p>
        ) : null}
      </div>

      {/* Not emptied while a page is in flight: the cards already here stay
          readable until the ones replacing them arrive. */}
      <div className="row user-reviews-grid" aria-busy={isLoading}>
        {reviews.map((review) => (
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

      <Pagination
        currentPage={page}
        lastPage={lastPage}
        onChange={changePage}
        label="Review pages"
      />
    </section>
  );
}
