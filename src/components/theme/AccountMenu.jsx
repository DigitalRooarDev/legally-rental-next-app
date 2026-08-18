'use client';

import Link from 'next/link';
import { useAuth } from '@/context/authContext';
import { MY_ACCOUNT_TABS } from '@/lib/constants';

/**
 * The only part of the header that depends on the session, split out so
 * `<Header />` itself stays a server component.
 */
export default function AccountMenu() {
  const { user, isAuthenticated, logout } = useAuth();

  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.name || 'My Account';

  /**
   * Both spellings, as the profile endpoint returns whichever shape it feels like —
   * the same pair `<AccountDetails>` reads. Empty for a guest, and empty for a
   * signed-in user who has never uploaded one, which is what keeps the glyph as the
   * fallback rather than a broken frame.
   */
  const avatar = isAuthenticated ? user?.profileImage || user?.profile_image || '' : '';

  return (
    <div className="header-right-list">
      <Link className="header-right-dropdown" href={isAuthenticated ? '/my-account' : '/login'}>
        <div className="header-right-icon">
          {avatar ? (
            /* A plain <img>, not `next/image`: this renders on *every* page, and
               `next/image` throws on a host missing from `remotePatterns`, which
               would take the whole site down rather than one avatar. At 26px there
               is nothing to optimise either. */
            /* eslint-disable-next-line @next/next/no-img-element -- see above */
            <img className="header-right-avatar" src={avatar} alt="" width={26} height={26} />
          ) : (
            <i className="icon icon-account" aria-hidden="true" />
          )}
        </div>
        <div className="header-right-content">
          {isAuthenticated ? displayName.split(' ')[0] : 'Sign In'}
          <span>Account</span>
        </div>
      </Link>
      {isAuthenticated && (
        <div className="my-account-dropdown">
          <ul>
            {MY_ACCOUNT_TABS.map((tab) => (
              <li key={tab.id}>
                <Link href={`/my-account?tab=${tab.id}`}>{tab.label}</Link>
              </li>
            ))}
            <li>
              <button type="button" className="account-dropdown-logout" onClick={logout}>
                <i className="icon icon-logout" aria-hidden="true" /> Logout
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
