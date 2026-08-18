'use client';

import { usePathname } from 'next/navigation';
import { HERO_ROUTES } from '@/components/theme/SearchForm';

/**
 * The `<header>` element itself, split out only so it can read the route.
 *
 * `full-header` marks the pages that show the full-height hero — the home page
 * — and is absent everywhere else, which is what every
 * `.header-main:not(.full-header)` rule in `app.css` keys off.
 *
 * A client component wrapping server-rendered `children`: `usePathname` is
 * resolved during SSR too, so the class is correct in the very first paint
 * rather than appearing after hydration. Nothing inside it is pulled client-side
 * — the children arrive as an already-rendered tree.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 */
export default function HeaderShell({ children }) {
  const pathname = usePathname();
  const isFullHeader = HERO_ROUTES.includes(pathname);

  return (
    <header className={isFullHeader ? 'header-main full-header' : 'header-main'}>{children}</header>
  );
}
