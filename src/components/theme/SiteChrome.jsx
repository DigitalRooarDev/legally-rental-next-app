"use client";

import { usePathname } from "next/navigation";

/**
 * Routes that stand alone, with no header and no footer.
 *
 * `/cancellation-policy` is a frame around a page that carries its own heading
 * and its own navigation. Wrapping that in this site's chrome would put two
 * headers on screen and leave the frame competing with a footer for the fold.
 */
const BARE_ROUTES = ["/cancellation-policy"];

const isBare = (pathname) =>
  BARE_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

/**
 * Renders the site chrome everywhere except the routes listed above.
 *
 * A client component wrapping server ones: `<Header>` and `<Footer>` stay server
 * components and are passed in as children, so nothing about them moves to the
 * browser — this only decides whether they appear.
 *
 * Chosen over a second root layout, which the App Router only allows if
 * `app/layout.jsx` is deleted and every existing route moves into a group, and
 * which then needs the experimental `globalNotFound` flag to keep a single 404.
 * That is a great deal of structure to move for one page.
 *
 * `usePathname` runs during server rendering too, so a bare route never paints a
 * header and then drops it.
 */
export default function SiteChrome({ children }) {
  return isBare(usePathname()) ? null : children;
}
