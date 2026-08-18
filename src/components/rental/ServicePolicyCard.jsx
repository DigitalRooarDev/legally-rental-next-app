import HouseRulesModal from '@/components/rental/HouseRulesModal';
import { describeCancellationPolicy } from '@/lib/cancellationPolicy';
import { CANCELLATION_POLICY_PATH } from '@/lib/constants';

/** Rules shown on the card itself; the rest live behind "Show all house rules". */
const PREVIEW_RULES = 3;

/**
 * The card under the booking panel: availability, cancellation and house rules.
 *
 * Every row is dropped when its data is missing, so a listing whose seller left
 * the fields blank shows a shorter card rather than empty headings.
 *
 * @param {object} props
 * @param {import('@/utils/mappers').ServiceDetailViewModel} props.service
 * @param {string} [props.policyHref]
 *   The host's full policy. Defaults to the site-wide rental terms, which is what
 *   every listing currently points at.
 */
export default function ServicePolicyCard({ service, policyHref = CANCELLATION_POLICY_PATH }) {
  const rules = service.booking ?? {};

  const minNights = rules.minNights || service.minimumBookingDay || 0;
  const availability = [
    minNights > 0 ? `Min ${minNights} day booking` : '',
    rules.advanceNotice ? `${rules.advanceNotice} advance notice` : '',
  ].filter(Boolean);

  const policy = describeCancellationPolicy(service.cancellationPolicy);

  // Phrased by the mapper so the card and the dialog cannot word the same rule
  // two different ways.
  const houseRules = rules.houseRules ?? [];
  const guidelines = houseRules.slice(0, PREVIEW_RULES);

  if (availability.length === 0 && !policy.label && guidelines.length === 0) return null;

  return (
    <aside className="service-policy-card">
      {availability.length > 0 ? (
        <div className="policy-row">
          <div className="policy-row-icon">
            <i className="icon icon-availability" aria-hidden="true" />
          </div>
          <div>
            <h3>Availability</h3>
            {availability.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      ) : null}

      {policy.label ? (
        <div className="policy-row">
          <div className="policy-row-icon">
            <i className="icon icon-cancellation" aria-hidden="true" />
          </div>
          <div>
            {/* The tier belongs in the heading: "Firm" is the part a returning
                visitor recognises, and it is what the checkout leads with too. */}
            <h3>{policy.label} cancellation policy</h3>
            {policy.summary ? <p>{policy.summary}</p> : null}
            {/* A new tab, not a navigation: this sits beside a booking panel
                whose dates and guests would be lost on the way back. */}
            <a href={policyHref} target="_blank" rel="noopener noreferrer">
              Review this Host&apos;s full policy for details.
            </a>
          </div>
        </div>
      ) : null}

      {guidelines.length > 0 ? (
        <div className="policy-row">
          <div className="policy-row-icon">
            <i className="icon icon-guidelines" aria-hidden="true" />
          </div>
          <div>
            <h3>Guidelines</h3>
            {guidelines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            {/* Only when there is genuinely more behind it. */}
            {houseRules.length > guidelines.length ? <HouseRulesModal rules={houseRules} /> : null}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
