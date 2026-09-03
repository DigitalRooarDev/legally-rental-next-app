'use client';

import { useState } from 'react';
import { Modal } from 'antd';
import HostReview from '@/components/users/HostReview';

/**
 * "Show all N reviews", plus the scrolling dialog it opens.
 *
 * Every review is already in the profile payload, so this needs no request of its
 * own — the page renders the first few itself and this re-lists the same array in
 * full. Only the trigger is a client component; the visible reviews above it stay
 * server-rendered and are complete in the first paint.
 *
 * @param {object} props
 * @param {import('@/utils/mappers').BuyerReview[]} props.reviews Every review, not the visible slice.
 */
export default function AllReviewsModal({ reviews }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!reviews?.length) return null;

  const count = reviews.length;

  return (
    <>
      <button
        type="button"
        className="btn btn-outline all-reviews-btn"
        aria-haspopup="dialog"
        onClick={() => setIsOpen(true)}
      >
        Show all {count} reviews
      </button>

      <Modal
        open={isOpen}
        onCancel={() => setIsOpen(false)}
        title={`${count} ${count === 1 ? 'review' : 'reviews'}`}
        footer={null}
        centered
        width={520}
        className="all-reviews-modal"
      >
        <p className="all-reviews-source">From hosts · {count}</p>
        {/* The list scrolls, not the dialog: the count above stays in view while
            the reviews move under it. */}
        <div className="all-reviews-list">
          {reviews.map((review) => (
            <HostReview key={review.id} review={review} />
          ))}
        </div>
      </Modal>
    </>
  );
}
