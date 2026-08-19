/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      allowedOrigins: [
        '54.215.206.197',
        'legallyng.com',
        'www.legallyng.com',
      ],
      bodySizeLimit: '6mb',
    },
  },
  /**
   * "Orders" became "Bookings" in the URLs as well as the labels. These keep the
   * old addresses working — a booking confirmation already sent, or a page a
   * customer bookmarked, would otherwise 404.
   *
   * Permanent because the new address is the canonical one; drop these once the
   * old links are safely out of circulation.
   */
  async redirects() {
    return [
      {
        source: '/my-account/order/:id',
        destination: '/my-account/booking/:id',
        permanent: true,
      },
      {
        source: '/my-account',
        has: [{ type: 'query', key: 'tab', value: 'my-order' }],
        destination: '/my-account?tab=my-bookings',
        permanent: true,
      },
    ];
  },
  images: {
    // Trimmed from the defaults: listing cards never exceed ~600px, so the wide
    // breakpoints only bloated every srcSet in the HTML payload.
    deviceSizes: [360, 480, 640, 828, 1080, 1440],
    imageSizes: [96, 128, 256, 384],
    // Every host that serves listing, feature or avatar images. `next/image`
    // throws on an unlisted host, so anything the API can return must be here.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'legallyng.com',
        pathname: '/**',
      },
      {
        // Covers api / staging / www and any other subdomain.
        protocol: 'https',
        hostname: '*.legallyng.com',
        pathname: '/**',
      },
      {
        // The v2 API serves seller profile images from this host.
        protocol: 'https',
        hostname: '247sue.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.247sue.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
