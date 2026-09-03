import ProfileAvatar from '@/components/users/ProfileAvatar';
import { formatMonthYear } from '@/utils/formats';

/**
 * One host's review of a guest — the same card in the page's three-up grid and in
 * the "show all reviews" dialog, so the two cannot drift apart.
 *
 * @param {object} props
 * @param {import('@/utils/mappers').BuyerReview} props.review
 */
export default function HostReview({ review }) {
  return (
    <article className="host-review">
      <div className="host-review-head">
        <ProfileAvatar src={review.hostImage} name={review.hostName} size={40} />
        <div className="host-review-author">
          <p className="host-review-name">{review.hostName}</p>
          {/* Not in the payload today; rendered only when it arrives, rather than
              reserving an empty line under every name. */}
          {review.hostLocation ? (
            <p className="host-review-location">{review.hostLocation}</p>
          ) : null}
        </div>
      </div>

      {review.date ? (
        <p className="host-review-date">{formatMonthYear(review.date)}</p>
      ) : null}

      {/* A rating can be left without words — most in the live payload are. Saying
          so keeps the card from looking like it failed to load. */}
      {review.comment ? (
        <p className="host-review-comment">{review.comment}</p>
      ) : (
        <p className="host-review-comment host-review-comment-empty">
          Rated this guest without leaving a comment.
        </p>
      )}
    </article>
  );
}
