import HostReviews from '@/components/users/HostReviews';
import ProfileIdentityCard from '@/components/users/ProfileIdentityCard';

export default function UserProfile({ profile }) {
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
          {/* Heading, pager and grid move as one — the count sits on the heading's
              own line, and `profile.reviews` is only the grid’s first page. */}
          <HostReviews
            buyerId={profile.id}
            name={profile.name}
            initialReviews={profile.reviews}
            total={profile.reviewCount}
          />
        </div>
      </div>
    </section>
  );
}
