import { getConfigMarketPlace } from '@/actions/getConfigMarketPlace';

export const metadata = {
  title: 'Cancellation policy',
  description: 'The cancellation terms that apply to every rental booked on Legally Rental.',
  /**
   * The text itself lives on the main LegallyNG site and is indexed there. A
   * framed copy under this domain would compete with the original for the same
   * query and win nothing — the crawler cannot read the frame anyway.
   */
  robots: { index: false, follow: false },
};

/**
 * `/cancellation-policy` — the host's full terms, framed full width.
 *
 * The policy is maintained on the main site, so this route embeds it rather than
 * duplicating the wording somewhere it would immediately drift. It is opened in
 * a new tab from the booking flow, which is what keeps a half-filled checkout —
 * dates, guests, card details — intact while the terms are read beside it.
 *
 * The address is not hard-coded: it comes from `getConfigMarketPlace`, the same
 * source the mobile apps read, so moving the page in the CMS moves it here too.
 *
 * A server component, so the URL resolves before anything is sent — the frame
 * starts loading in the first paint rather than after a round trip. The config
 * call is `cache()`d and the layout already makes it, so this costs no extra
 * request.
 */
export default async function CancellationPolicyPage() {
  const { rentalCancellationPolicyUrl } = await getConfigMarketPlace();

  return (
    <section className="policy-page">
      <iframe
        className="policy-page-frame"
        src={rentalCancellationPolicyUrl}
        title="Rental cancellation policy"
        /**
         * No `sandbox`. It is the one attribute that can leave a frame silently
         * blank — a restriction the framed page trips over produces no error,
         * just white — and it buys little here: `247sue.com` is the same
         * organisation's own site, already trusted for images in `next.config`.
         */
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </section>
  );
}
