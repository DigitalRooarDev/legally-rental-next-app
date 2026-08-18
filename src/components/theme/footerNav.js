/** Footer link groups + social links — data-driven so the markup stays declarative. */

export const SOCIAL_LINKS = [
  { href: 'https://www.facebook.com/legallyng/', className: 'fb', icon: 'icon-facebook', title: 'Facebook' },
  { href: 'https://www.instagram.com/legallyng/', className: 'instagram', icon: 'icon-instagram', title: 'Instagram' },
  { href: 'https://x.com/Legally_ng', className: 'twitter', icon: 'icon-twitter', title: 'Twitter' },
  { href: 'https://www.tiktok.com/@legallyng', className: 'tiktok', icon: 'icon-tiktok', title: 'TikTok' },
  { href: 'https://www.linkedin.com/company/legallyng/', className: 'linkedin', icon: 'icon-linkedin', title: 'LinkedIn' },
  { href: 'https://www.youtube.com/@legallyng', className: 'youtube', icon: 'icon-youtube', title: 'Youtube' },
];

export const FOOTER_COLUMNS = [
  {
    title: 'General',
    colClass: 'general-links-col',
    links: [
      { label: 'About Us', href: 'https://group.legallyng.com/about-us/', external: true },
      { label: 'Legally', href: '/' },
      { label: 'Sue', href: 'https://sue.legallyng.com/', external: true },
      { label: 'Contact Us', href: 'https://group.legallyng.com/contact-us/', external: true },
      { label: 'Blog', href: 'https://blog.legallyng.com/', external: true },
    ],
  },
  {
    title: 'Rental Categories',
    colClass: 'money-col',
    links: [
      { label: 'Property', href: '/search?category=property' },
      { label: 'Equipment', href: '/search?category=equipment' },
      { label: 'Vehicle', href: '/search?category=vehicle' },
      { label: 'Fashion', href: '/search?category=fashion' },
    ],
  },
  {
    title: 'Make Money with Us',
    colClass: 'money-col',
    links: [
      { label: 'Seller', href: 'https://sell.legallyng.com/', external: true },
      { label: 'Sales Partner', href: 'https://salespartner.legallyng.com/', external: true },
      { label: 'Rental', href: 'https://rental.legallyng.com/', external: true },
      {
        label: 'Wholesale Signup',
        href: 'https://signup.legallyng.com/?seller_type=wholeseller',
        external: true,
      },
    ],
  },
  {
    title: 'Help',
    colClass: 'help-col',
    links: [
      { label: 'Privacy Policy', href: '/privacy-policy' },
      { label: 'Terms and Conditions', href: '/terms-and-conditions' },
      { label: 'Terms of Service', href: 'https://group.legallyng.com/terms-of-service/', external: true },
      { label: 'Cookies Policy', href: 'https://group.legallyng.com/cookies-policy/', external: true },
      {
        label: 'Refund & Return Policy',
        href: 'https://group.legallyng.com/cancellation-policy/',
        external: true,
      },
    ],
  },
];

export const APP_STORE_LINKS = [
  {
    href: 'https://apps.apple.com/us/app/legally-marketplace/id6749606321',
    title: 'App Store',
    image: '/images/app-store.svg',
    alt: 'app-store',
  },
  {
    href: 'https://play.google.com/store/apps/details?id=app.legallymarketplace',
    title: 'Play Store',
    image: '/images/play-store.svg',
    alt: 'play-store',
  },
];
