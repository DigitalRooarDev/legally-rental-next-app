/**
 * Copy for `/about-us`, data-driven so the markup stays declarative — the same
 * shape `footerNav.js` uses for the footer.
 *
 * The animations are served from `public/lottie/` rather than from the
 * WordPress site they came from: those files carry no `Access-Control-Allow-Origin`
 * header, so the player's `fetch` is blocked cross-origin. They total ~32 KB.
 */

/** `/lottie/<icon>.lottie` is the animation; `label` is the benefit. */
export const RENTAL_BENEFITS = [
  { icon: 'task-list', label: 'Unlimited listing' },
  { icon: 'schedule', label: 'Set availability as it pleases you' },
  { icon: 'customer', label: 'Enormous clientele' },
  { icon: 'responsive', label: 'Manage your rental business digitally' },
  { icon: 'calendar', label: 'Calendar based booking' },
  { icon: 'business-plan', label: 'Better overview of your business' },
  { icon: 'label', label: 'Enhanced pricing feature' },
  { icon: 'deposit', label: 'Possibility to set caution fee / security deposit' },
  { icon: 'booking', label: 'Set minimum booking time' },
  { icon: 'influencer', label: 'Eliminate middle men' },
  { icon: 'task', label: 'Your listing is always in the market' },
];

/** "How Rental Works?" — only the first step carries a description. */
export const RENTAL_STEPS = [
  {
    title: 'Registration',
    description: 'Register yourself as a certified seller and start your earning.',
  },
  { title: 'Add your rental services' },
  { title: 'Decide your rates and create the availability on calendar' },
  { title: 'Start managing your rental business digitally' },
  { title: 'Start accepting bookings and get credited.' },
];

export const RENTAL_FAQS = [
  {
    question: 'Is there a limit to the amount of products or services I can sell?',
    answer:
      'No, there are no limits in adding up your assets on the platform. You can add as much as you want to.',
  },
  {
    question: 'Can I list my long lease properties as BnB?',
    answer: 'Yes, definitely you can list your long leased property on BnB.',
  },
  {
    question: 'Can I apply caution fees?',
    answer: 'Yes, one can apply caution fees for their properties.',
  },
  {
    question: 'Can I define the duration of the minimum rental?',
    answer: 'Yes, Legally gives you an option to define the duration of minimum rental.',
  },
  {
    question: 'Can I block my rental calendar?',
    answer:
      'Yes, you can block your calendar for the period you do not want to render the rental service.',
  },
];
