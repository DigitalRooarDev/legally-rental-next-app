import AboutUs from '@/components/about/AboutUs';

export const metadata = {
  title: 'About Us',
  description:
    'Legally Rental is an all-in-one platform to rent out your property, vehicles, equipment and more — automate booking, payment, availability, pricing, check-in and check-out.',
  alternates: { canonical: '/about-us' },
  openGraph: {
    title: 'About Legally Rental',
    description:
      'Digitalize your rental business: automated bookings, calendar availability, pricing and payouts in one platform.',
  },
};

export default function AboutUsPage() {
  return <AboutUs />;
}
