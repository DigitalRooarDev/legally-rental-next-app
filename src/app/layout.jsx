import { Suspense } from 'react';
import Script from 'next/script';
import { Poppins } from 'next/font/google';
import { ConfigProvider } from 'antd';
import { AntdRegistry } from '@ant-design/nextjs-registry';

import 'bootstrap/dist/css/bootstrap.min.css';
import '@/styles/icon.css';
import '@/styles/style.css';
import '@/styles/app.css';
import '@/styles/date-range-calendar.css';
// Last on purpose: every rule in it is a media-query override of a plain
// declaration above, and equal specificity is decided by source order.
import '@/styles/responsive.css';

import { antdTheme } from '@/lib/antdTheme';
import { getCategories } from '@/actions/getCategories';
import { getConfigMarketPlace } from '@/actions/getConfigMarketPlace';
import { getUserProfile } from '@/actions/getUserProfile';
import { ActiveCategoryProvider } from '@/context/activeCategoryContext';
import { AuthProvider } from '@/context/authContext';
import { RentalOptionsProvider } from '@/context/rentalOptionsContext';
import { ToastProvider } from '@/context/toastContext';
import BodyWrapper from '@/components/BodyWrapper';
import Header from '@/components/theme/Header';
import Footer from '@/components/theme/Footer';
import SiteChrome from '@/components/theme/SiteChrome';
import BackToTop from '@/components/theme/BackToTop';
import BootstrapClient from '@/components/theme/BootstrapClient';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-poppins',
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://rental.legallyng.com'),
  title: {
    default: 'Legally Rental — Rent property, vehicles, equipment & fashion in Nigeria',
    template: '%s | Legally Rental',
  },
  description:
    'Rent verified property, vehicles, equipment, halls and fashion across Nigeria on Legally Rental.',
  icons: { icon: '/favicon.png' },
  openGraph: { type: 'website', siteName: 'Legally Rental' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#8121cf',
};

/**
 * Header, footer and the session are resolved once here rather than per page.
 *
 * Seeding `<AuthProvider initialUser>` from the server means a signed-in visitor
 * never sees the header flash "Sign In" while a client request resolves. Guests
 * pay nothing for it — `getUserProfile` short-circuits without a session cookie.
 */
export default async function RootLayout({ children }) {
  // `categoryList` rather than the dashboard's category slice: it is the only
  // source that carries the hero icons and the sub-category tree.
  const [categories, profile, rentalOptions] = await Promise.all([
    getCategories(),
    getUserProfile(),
    getConfigMarketPlace(),
  ]);

  return (
    <html lang="en" className={poppins.variable}>
     
      <body>
        {/* Extracts antd's CSS-in-JS during SSR so modals don't flash unstyled. */}
        <AntdRegistry>
          {/* Brand tokens here rather than `.ant-*` overrides in app.css, so antd
              derives its own hover/active/disabled ramp from the same colour. */}
          <ConfigProvider theme={antdTheme}>
            {/* Inside `<ConfigProvider>` so toasts inherit the brand typeface —
                that is the whole reason this is a provider and not antd's
                static `message.success(...)`. */}
            <ToastProvider>
              <AuthProvider initialUser={profile?.status ? profile.user : null}>
                <RentalOptionsProvider value={rentalOptions}>
                  {/* Wraps header *and* page: a listing page publishes its category
                      upward from here for the header's strip to pre-select. */}
                  <ActiveCategoryProvider>
                    <BodyWrapper>
                      <div className="wrapper">
                        {/* `<SearchForm />` reads searchParams-adjacent route state, so it needs a boundary. */}
                        <Suspense fallback={null}>
                          <SiteChrome>
                            <Header categories={categories} />
                          </SiteChrome>
                        </Suspense>
                        <div className="main">{children}</div>
                        <SiteChrome>
                          <Footer />
                        </SiteChrome>
                      </div>
                    </BodyWrapper>
                  </ActiveCategoryProvider>
                </RentalOptionsProvider>
              </AuthProvider>
            </ToastProvider>
          </ConfigProvider>
        </AntdRegistry>

        <BackToTop />
        <BootstrapClient />

        {/* Checkout gateways. Loaded here rather than on demand because both SDKs
            attach globals the checkout expects to already exist, and `async` keeps
            them off the critical path. Paystack needs no tag — it is bundled from
            `@paystack/inline-js`. */}
        <Script
          id="paypal-sdk"
          src={`https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&currency=USD&components=buttons`}
          strategy="afterInteractive"
        />
        <Script
          id="seerbit-sdk"
          src="https://checkout.seerbitapi.com/api/v2/seerbit.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
