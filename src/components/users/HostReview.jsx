'use client';

import { useState } from 'react';
import ProfileAvatar from '@/components/users/ProfileAvatar';
import StarRating from '@/components/my-account/StarRating';
import { formatMonthYear } from '@/utils/formats';

/**
 * Questions a collapsed card shows. Beyond this the card is taller than the two
 * beside it in the row, which is what "Read more" is for.
 */
const VISIBLE_QUESTIONS = 4;

/**
 * `5` -> "5", `2.3` -> "2.3". One decimal at most, and none when it says nothing:
 * the scale is printed beside it, so "5.00" is three characters of noise.
 */
const formatScore = (value) => String(Number(value.toFixed(1)));

/**
 * One host's review of a guest.
 *
 * A review is a set of questions, each with the options the host ticked and,
 * where they picked "Others", a line of their own. It reuses the `.review-*`
 * markup of the read-back on the booking page, so a review reads identically
 * wherever it appears.
 *
 * Every question it shows is shown answered, and in full — the breakdown and the
 * host's own words are most of what a review now says, so there is nothing to
 * gain by folding either away. The only thing the card holds back is the
 * questions past the fourth, which "Read more" brings in.
 *
 * @param {object} props
 * @param {import('@/utils/mappers').BuyerReview} props.review
 */
export default function HostReview({ review }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const questions = review.questions ?? [];
  const canExpand = questions.length > VISIBLE_QUESTIONS;
  const visible = isExpanded ? questions : questions.slice(0, VISIBLE_QUESTIONS);
  const date = formatMonthYear(review.date);

  return (
    <article className="host-review">
      <div className="host-review-head">
        <ProfileAvatar src={review.hostImage} name={review.hostName} size={48} />
        <div className="host-review-author">
          <p className="host-review-name">{review.hostName}</p>
          {review.hostLocation ? (
            <p className="host-review-meta">
              <i className="icon icon-map" aria-hidden="true" />
              {review.hostLocation}
            </p>
          ) : null}
          {date ? (
            <p className="host-review-meta">
              <i className="icon icon-calendar" aria-hidden="true" />
              {date}
            </p>
          ) : null}
        </div>
      </div>

      {review.rating > 0 ? (
        <div className="host-review-rating">
          <span className="host-review-rating-label">Overall Rating</span>
          <div className="host-review-rating-row">
            <span className="host-review-rating-value">
              {formatScore(review.rating)}
              {/* <span className="host-review-rating-max">/5</span> */}
            </span>
            <StarRating
              value={review.rating}
              label={`Overall rating from ${review.hostName}`}
              readOnly
            />
          </div>
        </div>
      ) : null}

      {questions.length > 0 ? (
        <div className="review-scores">
          {visible.map((entry, index) => (
            <div className="review-answer" key={`${index}-${entry.question}`}>
              <div className="review-score">
                <span className="review-score-question">{entry.question}</span>
              </div>

              {entry.answers.length > 0 ? (
                <ul className="review-selected">
                  {entry.answers.map((answer) => (
                    <li key={answer}>{answer}</li>
                  ))}
                </ul>
              ) : null}

              {entry.comment ? <p className="review-answer-comment">{entry.comment}</p> : null}
            </div>
          ))}
        </div>
      ) : (
        /* A review from before the questions were added, or one where every
           question came back blank. Saying so beats an empty card. */
        <p className="host-review-comment host-review-comment-empty">
          {review.comment || 'Rated this guest without leaving a comment.'}
        </p>
      )}

      {canExpand ? (
        <button
          type="button"
          className="host-review-more"
          onClick={() => setIsExpanded((current) => !current)}
          aria-expanded={isExpanded}
        >
          {isExpanded ? 'Read less' : `Read more (${questions.length - VISIBLE_QUESTIONS})`}
        </button>
      ) : null}
    </article>
  );
}
