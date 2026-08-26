'use client';

import { useState } from 'react';
import ReviewDialog from '@/components/my-account/ReviewDialog';
import StarRating from '@/components/my-account/StarRating';

/** The scale every score on this screen is out of. */
const MAX_RATING = 5;

/**
 * Whether this booking can still be reviewed.
 *
 *   `statusCode` 4 or 5  Completed or Rejected — the booking has reached its end,
 *                        which is when there is an experience to rate.
 *   `!isReviewGiven`     The API allows one review per booking and sets this once it
 *                        has one, so the form retires itself.
 *
 * The listing and host are deliberately *not* checked here any more:
 * `reviewQuestionList` answers with its own `review_to`, so the form no longer
 * depends on the order carrying a seller id.
 *
 * @param {object} order From `toOrderDetailViewModel`.
 */
export const canReviewBooking = (order) =>
  (order?.statusCode === 4 || order?.statusCode === 5) && !order.isReviewGiven;

/**
 * "Rate Your Rental" — the box under the tracking history.
 *
 * Two states: the form's trigger while the booking is unreviewed, and the scores
 * read back once it is not. The form itself lives in `<ReviewDialog>`, which is
 * where the server-defined questions are handled.
 *
 * @param {object} props
 * @param {object} props.order From `toOrderDetailViewModel`.
 */
export default function OrderReviewBox({ order }) {
  const [isOpen, setIsOpen] = useState(false);

  const review = order.review;

  /**
   * A review already left is shown whatever the status: it is the visitor's own
   * words, and the only page that carries them. Gating the read-back on 4-or-5 as
   * well would hide a review the moment the booking moved on from the state it was
   * written in.
   */
  if (!review && !canReviewBooking(order)) return null;

  return (
    <div className="checkout-step order-action-box">
      <div className="order-history-title mb-0">Rate Your Rental</div>
      <p className="order-action-lead">
        Tell us how your rental experience went. Your feedback helps us improve.
      </p>

      {review ? (
        <div className="order-action-body">
          <div className="review-overall">
            <span className="review-overall-label">Overall Rating</span>
            <div className="review-overall-score">
              <StarRating value={review.overall} label="Overall rating" readOnly />
              <span className="review-overall-value">
                {review.overall.toFixed(2)} out of {MAX_RATING}
              </span>
            </div>
          </div>

          <div className="review-scores">
            {review.questions.map((question) => (
              <div className="review-answer" key={question.id}>
                <div className="review-score">
                  <span className="review-score-question">{question.question}</span>
                  <span className="review-score-value">
                    <i className="icon icon-star" aria-hidden="true" />
                    {question.rating} out of {MAX_RATING}
                  </span>
                </div>

                {/* The suggested answers ticked — the reason behind the score, which
                    the number on its own does not give. */}
                {question.selectedOptions.length > 0 ? (
                  <ul className="review-selected">
                    {question.selectedOptions.map((option) => (
                      <li key={option.id}>{option.label == 'Others' ? 'Comment' :option.label}</li>
                    ))}
                  </ul>
                ) : null}

                {question.comment ? (
                  <p className="review-answer-comment">{question.comment}</p>
                ) : null}
              </div>
            ))}
          </div>

          {/* Shown even though the app's own summary omits it: the visitor was asked
              for it and typed it, and this is the only screen it comes back on. */}
          {review.comment ? <p className="review-comment">{review.comment}</p> : null}
        </div>
      ) : (
        <div className="order-action-body">
          <button
            type="button"
            className="btn btn-outline-primary w-100"
            onClick={() => setIsOpen(true)}
          >
            Share feedback
          </button>
        </div>
      )}

      <ReviewDialog open={isOpen} onClose={() => setIsOpen(false)} orderId={order.id} />
    </div>
  );
}
