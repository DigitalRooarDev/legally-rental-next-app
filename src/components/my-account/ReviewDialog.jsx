'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from 'antd';
import StarRating from '@/components/my-account/StarRating';
import { useToast } from '@/context/toastContext';
import { getReviewQuestions } from '@/actions/getReviewQuestions';
import { submitReview } from '@/actions/submitReview';

const MAX_COMMENT = 500;
/** The per-question "Others" box is an aside, not an essay. */
const MAX_OTHER = 250;

const EMPTY_ANSWER = Object.freeze({ rating: 0, optionIds: [], comment: '' });

/**
 * "Rate Your Rental Experience" — the review form, as the server defines it.
 *
 * The questions, their wording and their suggested answers come from
 * `reviewQuestionList`, so nothing here assumes how many there are or what they
 * ask. Each question takes a star rating, any number of its suggested answers, and
 * — only when the question offers an "Others" option and it is ticked — a line of
 * free text. An overall rating and an optional closing comment bracket the set.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string|number} props.orderId
 */
export default function ReviewDialog({ open, onClose, orderId }) {
  const router = useRouter();
  const toast = useToast();

  const [form, setForm] = useState(null);
  /** 'idle' | 'loading' | 'ready' | 'failed' */
  const [loadState, setLoadState] = useState('idle');
  const [overall, setOverall] = useState(0);
  const [comment, setComment] = useState('');
  /** `{ [questionId]: { rating, optionIds, comment } }` */
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');

    // Per-order, but it does not change between openings of the same page.
    if (form) return;

    setLoadState('loading');
    const result = await getReviewQuestions(orderId);

    setForm(result.form);
    setLoadState(result.form ? 'ready' : 'failed');

    if (!result.form) {
      setError(result.message || 'The review questions are unavailable right now.');
    }
  };

  const close = () => {
    // Never mid-submit: the request is already with the server, and closing here
    // would leave the visitor unsure whether it landed.
    if (isSubmitting) return;

    setError('');
    onClose();
  };

  const answerFor = (questionId) => answers[questionId] ?? EMPTY_ANSWER;

  const patchAnswer = (questionId, patch) =>
    setAnswers((current) => ({
      ...current,
      [questionId]: { ...(current[questionId] ?? EMPTY_ANSWER), ...patch },
    }));

  const toggleOption = (question, option) => {
    const answer = answerFor(question.id);
    const isOn = answer.optionIds.includes(option.id);
    const optionIds = isOn
      ? answer.optionIds.filter((id) => id !== option.id)
      : [...answer.optionIds, option.id];

    patchAnswer(question.id, {
      optionIds,
      /**
       * Un-ticking "Others" clears the text it opened. Left in place it would be
       * submitted as a comment on an option the visitor had just withdrawn.
       */
      ...(option.isOther && isOn ? { comment: '' } : {}),
    });
  };

  const submit = async () => {
    if (isSubmitting || !form) return;

    if (overall < 1) {
      setError('Give an overall rating to continue.');
      return;
    }

    const unrated = form.questions.find((question) => answerFor(question.id).rating < 1);
    if (unrated) {
      setError('Please rate every question.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const result = await submitReview({
        orderId,
        reviewTo: form.reviewTo,
        reviewType: form.reviewType,
        overallRating: overall,
        comment,
        answers: form.questions.map((question) => {
          const answer = answerFor(question.id);
          const other = question.options.find((option) => option.isOther);
          const wantsOther = Boolean(other) && answer.optionIds.includes(other.id);

          return {
            questionId: question.id,
            rating: answer.rating,
            // Only when "Others" is actually ticked — see `toggleOption`.
            comment: wantsOther ? answer.comment : '',
            optionIds: answer.optionIds,
          };
        }),
      });

      if (!result.status) {
        setError(result.message);
        return;
      }

      toast.success(result.message);
      onClose();
      setOverall(0);
      setComment('');
      setAnswers({});

      /**
       * Re-runs the server render, which comes back with `isReviewGiven` set — so
       * the box retires itself off the API's answer rather than a local flag that
       * would disagree with it after a refresh.
       */
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={close}
      title="Rate Your Rental Experience"
      footer={null}
      centered
      className="checkout-edit-modal review-modal"
      destroyOnHidden
      maskClosable={!isSubmitting}
      afterOpenChange={(isOpen) => {
        if (isOpen) load();
      }}
    >
      <p className="review-lead">We&apos;d love to know how your recent rental went.</p>

      {loadState === 'loading' ? <p className="checkout-method-note">Loading questions…</p> : null}

      {form ? (
        <>
          <div className="review-question">
            {/* Label and stars share one line — the form is long enough without a
                row break between a question and its answer. */}
            <div className="review-question-head">
              <span className="review-question-label">Overall, how was your rental?</span>
              <StarRating
                label="Overall rating"
                value={overall}
                onChange={setOverall}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {form.questions.map((question, index) => {
            const answer = answerFor(question.id);
            const other = question.options.find((option) => option.isOther);
            const showOther = Boolean(other) && answer.optionIds.includes(other.id);

            return (
              <div className="review-question" key={question.id}>
                <div className="review-question-head">
                  <span className="review-question-label">{question.question}</span>
                  <StarRating
                    label={question.question}
                    value={answer.rating}
                    onChange={(next) => patchAnswer(question.id, { rating: next })}
                    disabled={isSubmitting}
                  />
                </div>

                {question.options.length > 0 ? (
                  <fieldset className="review-options">
                    {question.options.map((option) => (
                      <label className="review-option" key={option.id}>
                        <input
                          type="checkbox"
                          checked={answer.optionIds.includes(option.id)}
                          onChange={() => toggleOption(question, option)}
                          disabled={isSubmitting}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </fieldset>
                ) : null}

                {showOther ? (
                  <textarea
                    className="form-control review-other"
                    rows={2}
                    maxLength={MAX_OTHER}
                    placeholder="Tell us what happened…"
                    value={answer.comment}
                    onChange={(event) => patchAnswer(question.id, { comment: event.target.value })}
                    disabled={isSubmitting}
                    aria-label={`Your own comment on: ${question.question}`}
                  />
                ) : null}
              </div>
            );
          })}

          <label className="reason-field" htmlFor="review-comment">
            <span className="reason-label">Anything else you would like to add? (optional)</span>
            <textarea
              id="review-comment"
              className="form-control"
              rows={3}
              maxLength={MAX_COMMENT}
              placeholder="Tell us more about your stay…"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              disabled={isSubmitting}
            />
            <span className="reason-count">
              {comment.length}/{MAX_COMMENT}
            </span>
          </label>
        </>
      ) : null}

      {error ? <p className="checkout-error">{error}</p> : null}

      <div className="checkout-edit-actions">
        <button
          type="button"
          className="btn btn-outline-primary btn-md"
          onClick={close}
          disabled={isSubmitting}
        >
          Later
        </button>
        <button
          type="button"
          className="btn btn-success btn-md"
          onClick={submit}
          disabled={isSubmitting || !form}
        >
          {isSubmitting ? 'Submitting…' : 'Submit rating'}
        </button>
      </div>
    </Modal>
  );
}
