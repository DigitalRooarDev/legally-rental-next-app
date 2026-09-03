'use client';

import { useState } from 'react';
import { Modal } from 'antd';
import ProfileAvatar from '@/components/users/ProfileAvatar';
import { formatMonthYear } from '@/utils/formats';

/**
 * Where "Learn more" goes. The group site's terms are the only page that
 * documents the verification checks; there is no in-app route for it yet.
 */
const IDENTITY_HELP_URL = 'https://group.legallyng.com/terms-of-service/';

export default function ProfileIdentityCard({ profile }) {
  const [isOpen, setIsOpen] = useState(false);

  const hasDialog = profile.isVerified || Boolean(profile.verificationNote);

  /**
   * "Verified · Since December 2025". `join_date` is not in this endpoint's
   * payload yet, so the years-on-Legally count stands in — the point of the line
   * is how long the member has been around, and that figure says it either way.
   */
  const since = formatMonthYear(profile.memberSince);
  const years = profile.stats.find((stat) => stat.key === 'years');
  const meta = [
    profile.isVerified ? 'Verified' : '',
    since ? `Since ${since}` : years ? `${years.value} ${years.label}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const summary = (
    <>
      <div className="profile-card-identity">
        <div className="profile-card-avatar">
          <ProfileAvatar src={profile.image} initial={profile.initial} size={88} />
          {profile.isVerified ? (
            <span className="profile-card-badge">
              <i className="icon icon-shield" aria-hidden="true" />
            </span>
          ) : null}
        </div>
        <p className="profile-card-name">{profile.name}</p>
        {profile.location ? <p className="profile-card-location">{profile.location}</p> : null}
      </div>

      {profile.stats.length > 0 ? (
        <ul className="profile-card-stats">
          {profile.stats.map((stat) => (
            <li key={stat.key}>
              <span className="profile-card-stat-value">{stat.value}</span>
              <span className="profile-card-stat-label">{stat.label}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );

  if (!hasDialog) return <div className="profile-card">{summary}</div>;

  return (
    <>
      <div className="profile-card profile-card-trigger">
        {summary}
        {/* Last in the card and stretched over it, so the click target is the
            whole card while the content above stays non-interactive. */}
        <button
          type="button"
          className="profile-card-overlay"
          aria-haspopup="dialog"
          onClick={() => setIsOpen(true)}
        >
          <span className="visually-hidden">About {profile.name}</span>
        </button>
      </div>

      <Modal
        open={isOpen}
        onCancel={() => setIsOpen(false)}
        /* Hidden rather than absent: without a title antd has no `aria-labelledby`
           to point at, leaving the dialog unnamed. The design shows only the close
           button, so `.identity-modal` collapses the header in `app.css`. */
        title={<span className="visually-hidden">About {profile.name}</span>}
        footer={null}
        centered
        width={420}
        className="identity-modal"
      >
        <div className="identity-hero">
          <div className="identity-hero-text">
            <p className="identity-hero-name">{profile.name}</p>
            {meta ? <p className="identity-hero-meta">{meta}</p> : null}
            <p className="identity-hero-copy">
              Trust is the cornerstone of the Legally community, and identity verification is part
              of how we build it.
            </p>
          </div>
          <ProfileAvatar
            src={profile.image}
            initial={profile.initial}
            size={84}
            className="identity-hero-avatar"
          />
        </div>

        {profile.verificationNote ? (
          <p className="identity-note">
            {profile.verificationNote}{' '}
            <a href={IDENTITY_HELP_URL} target="_blank" rel="noopener noreferrer">
              Learn more
            </a>
          </p>
        ) : null}
      </Modal>
    </>
  );
}
