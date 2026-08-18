import Image from 'next/image';
import Link from 'next/link';
import { APP_STORE_LINKS, FOOTER_COLUMNS, SOCIAL_LINKS } from '@/components/theme/footerNav';

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

export default function Footer() {
  const year = new Date().getUTCFullYear();

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

            {FOOTER_COLUMNS.map((column) => (
              <div className={`footer-col ${column.colClass}`} key={column.title}>
                <div className="footer-box">
                  <h5 className="footer-title">{column.title}</h5>
                  <ul className="menu">
                    {column.links.map((link) => (
                      <li key={`${column.title}-${link.label}`}>
                        <FooterLink link={link} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}

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
