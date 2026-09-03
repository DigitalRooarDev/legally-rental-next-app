import { notFound } from 'next/navigation';
import UserProfile from '@/components/users/UserProfile';
import { getBuyerProfile } from '@/actions/getBuyerProfile';

/**
 * `getBuyerProfile` is `cache()`d, so this shares one request with the page body.
 *
 * `noindex`: the page is public — a host reaches it from a review byline without
 * signing in — but it is a person's profile, not marketing. Listing every member
 * in search results is not what publishing it for that journey was for.
 */
export async function generateMetadata({ params }) {
  const { user_id: userId } = await params;
  const { profile } = await getBuyerProfile(userId);

  if (!profile) return { title: 'Profile not found', robots: { index: false } };

  return {
    title: profile.name,
    description: `${profile.name}${profile.location ? ` from ${profile.location}` : ''} on Legally Rental.`,
    robots: { index: false },
  };
}

export default async function UserProfilePage({ params }) {
  const { user_id: userId } = await params;
  const { profile } = await getBuyerProfile(userId);

  if (!profile) notFound();

  return <UserProfile profile={profile} />;
}
