import Image from 'next/image';
import Link from 'next/link';
import {
  APP_STORE_LINKS,
  CATEGORY_COLUMN_ID,
  FOOTER_COLUMNS,
  SOCIAL_LINKS,
} from '@/components/theme/footerNav';
import { categoryParam } from '@/lib/categories';

/**
 * `categoryList` -> the "Rental Categories" column.
 *
 * `categoryParam` rather than `category.slug`: it falls back to the id for a
 * category the API sends without a slug, which `/search` resolves either way —
 * without it such a category would link to `?category=` and filter nothing.
 *
 * Sub-categories are deliberately left out. The API returns 40-odd across the
 * five parents, and the footer's job is the top of each tree; `/search` is where
 * they are narrowed.
 */
const toCategoryLinks = (categories) =>
  (Array.isArray(categories) ? categories : [])
    .map((category) => {
      const param = categoryParam(category);
      if (!param || !category?.name) return null;

      return {
        label: category.name,
        href: `/search?category=${encodeURIComponent(param)}`,
      };
    })
    .filter(Boolean);

function FooterLink({ link }) {
  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer">
        {link.label}
      </a>
    );
  }

  return <Link href={link.href}>{link.label}</Link>;
}

/**
 * @param {object} props
 * @param {Array<{id: string, name: string, slug: string}>} [props.categories]
 *   From `getCategories()`, which the layout already awaits for the header —
 *   it is `cache()`d, so passing it here costs no extra request. Empty on an API
 *   failure, which leaves the column on its hard-coded fallback.
 */
export default function Footer({ categories = [] }) {
  const year = new Date().getUTCFullYear();
  const categoryLinks = toCategoryLinks(categories);

  return (
    <>
      <footer className="footer-sec">
        <div className="container">
          <div className="footer-row row">
            <div className="footer-col footer-logo-col">
              <Link title="Legally" className="footer-logo d-none d-sm-inline-block" href="/">
                <Image src="/images/white-logo.svg" alt="legally" width={225} height={52} />
              </Link>
              <div className="cms-con">
                <p>Join our community</p>
              </div>
              <div className="social-media">
                {SOCIAL_LINKS.map((social) => (
                  <a
                    key={social.title}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={social.className}
                    title={social.title}
                  >
                    <i className={`icon ${social.icon}`} aria-hidden="true" />
                    <span className="visually-hidden">{social.title}</span>
                  </a>
                ))}
              </div>
            </div>

            {FOOTER_COLUMNS.map((column) => {
              // Only the categories column is dynamic, and only when the call
              // returned something — an empty list keeps the written links
              // rather than rendering a heading with nothing under it.
              const links =
                column.id === CATEGORY_COLUMN_ID && categoryLinks.length > 0
                  ? categoryLinks
                  : column.links;

              return (
                <div className={`footer-col ${column.colClass}`} key={column.title}>
                  <div className="footer-box">
                    <h5 className="footer-title">{column.title}</h5>
                    <ul className="menu">
                      {links.map((link) => (
                        <li key={`${column.title}-${link.label}`}>
                          <FooterLink link={link} />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}

            <div className="footer-col downloadapp-col">
              <div className="footer-box">
                <h5 className="footer-title">Download App</h5>
                <div className="download-app-img-box">
                  {APP_STORE_LINKS.map((store) => (
                    <a
                      key={store.title}
                      href={store.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={store.title}
                      className="download-app-img"
                    >
                      <Image src={store.image} alt={store.alt} width={124} height={41} />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <div className="copyright-footer">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-sm-7">
              <div className="cms-con">
                <p>
                  © {year}{' '}
                  <Link title="Legally" href="/">
                    Legally.
                  </Link>{' '}
                  All Rights Reserved.
                </p>
              </div>
            </div>
            <div className="col-sm-5">
              <div className="cms-con text-sm-end text-center pt-sm-0">
                <p>Designed and developed by 247Tech</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
