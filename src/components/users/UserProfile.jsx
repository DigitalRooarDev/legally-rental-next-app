import AllReviewsModal from '@/components/users/AllReviewsModal';
import HostReview from '@/components/users/HostReview';
import ProfileIdentityCard from '@/components/users/ProfileIdentityCard';
import EmptyState from '@/components/theme/EmptyState';

const VISIBLE_REVIEWS = 3;
export default function UserProfile({ profile }) {
  const visible = profile.reviews.slice(0, VISIBLE_REVIEWS);
  const hasMore = profile.reviews.length > VISIBLE_REVIEWS;

  const facts = [
    profile.bornIn ? { key: 'born', icon: 'born', label: profile.bornIn } : null,
    profile.isVerified ? { key: 'verified', icon: 'shield', label: 'Identity verified' } : null,
  ].filter(Boolean);

  return (
    <section className="user-profile-sec">
      <div className="container">
        <div className="user-profile-top">
          <ProfileIdentityCard profile={profile} />

          <div className="user-profile-top-right">
            <h1 className="user-profile-title">About {profile.name}</h1>

            {facts.length > 0 ? (
              <ul className="user-facts">
                {facts.map((fact) => (
                  <li key={fact.key}>
                    <i className={`icon icon-${fact.icon}`} aria-hidden="true" /> {fact.label}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="user-facts-empty">
                {profile.name} hasn&apos;t added any details to their profile yet.
              </p>
            )}
          </div>
        </div>

        <div className="user-reviews">
          <h2 className="user-reviews-title">What hosts are saying about {profile.name}</h2>

          {visible.length > 0 ? (
            <>
              <div className="row user-reviews-grid gx-5 gx-md-6">
                {visible.map((review) => (
                  <div className="col-md-4" key={review.id}>
                    <HostReview review={review} />
                  </div>
                ))}
              </div>

              {/* Only when there is something behind it — with three or fewer
                  reviews the page is already showing every one of them. */}
              {hasMore ? <AllReviewsModal reviews={profile.reviews} /> : null}
            </>
          ) : (
            <EmptyState
              message={`${profile.name} hasn't been reviewed by a host yet.`}
              className="empty-state"
            />
          )}
        </div>
      </div>
    </section>
  );
}
