export type PackageId = 'starter' | 'professional' | 'growth' | 'custom';

export type Package = {
  id: PackageId;
  title: string;
  price: string;
  priceValue: number | null;
  description: string;
  includes: string[];
  bestFor: string[];
  cta: string;
  customerFacingExplanation: string;
  checkoutUrl?: string;
  featured?: boolean;
};

export type AddOn = {
  id: string;
  name: string;
  internalName: string;
  price: string;
  priceValue: number;
  description: string;
  includes: string[];
  bestFor: string;
  billing: 'one-time' | 'monthly';
  checkoutUrl?: string;
};

export const packages: Package[] = [
  {
    id: 'starter',
    title: 'Starter Website',
    price: 'Starting at $499',
    priceValue: 499,
    description: 'A clean, professional website to get your business online and build credibility.',
    bestFor: ['New Businesses', 'Contractors', 'Small Orgs'],
    includes: [
      '1-3 pages',
      'Mobile-friendly design',
      'Contact form',
      'Basic SEO setup',
      'Fast-loading modern layout',
      'Call-to-action buttons',
    ],
    cta: 'Start My Website',
    customerFacingExplanation:
      'Perfect if you need a simple website that helps people find you.',
    checkoutUrl: 'https://www.paypal.com/ncp/payment/TS4B6ND3JD9RQ',
  },
  {
    id: 'professional',
    title: 'Professional Website',
    price: 'Starting at $999',
    priceValue: 999,
    description: 'A full business website built to show your services, build trust, and turn visitors into customers.',
    bestFor: ['Service Businesses', 'Retail & Local', 'Creators'],
    includes: [
      '4-7 pages',
      'Custom homepage',
      'Services pages',
      'About page',
      'Basic SEO + analytics setup',
      'Mobile responsive design',
      'Contact form + strong CTAs',
    ],
    cta: 'Build My Business Website',
    customerFacingExplanation:
      'Best for businesses that need a complete online presence with enough room to explain services, show photos, build trust, and generate leads.',
    featured: true,
    checkoutUrl: 'https://www.paypal.com/ncp/payment/776NMJ97LJZ2Q',
  },
  {
    id: 'growth',
    title: 'Business Growth Website',
    price: 'Starting at $1,999',
    priceValue: 1999,
    description: 'A premium website with advanced features to help you generate leads, automate, and scale faster.',
    bestFor: ['Growing Businesses', 'Advanced Needs', 'Teams'],
    includes: [
      'Everything in Professional Website',
      'Advanced custom design',
      'Lead capture & CRM integration',
      'Conversion-focused layout',
      'Advanced SEO & analytics',
      'Priority support',
    ],
    cta: 'Grow My Business Online',
    customerFacingExplanation:
      'Best for businesses ready to grow, automate, and dominate online.',
    checkoutUrl: 'https://www.paypal.com/ncp/payment/MVEQMSVCGDFQL',
  },
  {
    id: 'custom',
    title: 'Custom Website',
    price: 'Custom Quote',
    priceValue: null,
    description: 'For larger projects, e-commerce, memberships, advanced systems, or unique website ideas.',
    bestFor: ['E-commerce stores', 'Large websites', 'Advanced booking systems', 'Membership websites', 'Custom dashboards', 'Web apps', 'Multi-location businesses'],
    includes: ['Discovery and scope review', 'Custom proposal', 'Tailored feature set', 'Project-specific pricing'],
    cta: 'Request a Custom Quote',
    customerFacingExplanation: 'Use this option when your project needs a custom scope, a special workflow, or a pricing conversation before launch.',
  },
];

export const addOns: AddOn[] = [
  {
    id: 'seo',
    name: 'Get Found on Google',
    internalName: 'SEO Optimization',
    price: 'Starting at $149',
    priceValue: 149,
    description:
      'Improve your website structure, page titles, descriptions, and local search setup so customers can find your business more easily online.',
    includes: ['Page titles and descriptions', 'Local search setup', 'Search-friendly structure', 'Indexing support'],
    bestFor: 'Businesses that want stronger visibility in local search and Google results.',
    billing: 'one-time',
    checkoutUrl: 'https://www.paypal.com/ncp/payment/JGKNRXCVLF8E4',
  },
  {
    id: 'lead-assistant',
    name: 'Never Miss a Lead',
    internalName: 'AI Lead Assistant',
    price: 'Starting at $299',
    priceValue: 299,
    description:
      'Add an AI-powered assistant that can answer questions and capture leads 24/7.',
    includes: ['AI chat assistant', 'FAQ responses', 'Lead capture flow', 'Business-specific setup'],
    bestFor: 'Service businesses, churches, consultants, and local brands that want help after hours.',
    billing: 'one-time',
    checkoutUrl: 'https://www.paypal.com/ncp/payment/WJQGNAXVCD9T6',
  },
  {
    id: 'booking',
    name: 'Let Customers Schedule Online',
    internalName: 'Booking System',
    price: 'Starting at $199',
    priceValue: 199,
    description:
      'Allow customers to book appointments, schedule services, or request consultations.',
    includes: ['Booking calendar', 'Confirmation flow', 'Appointment reminders', 'Calendar integration'],
    bestFor: 'Businesses that book consultations, appointments, or service visits.',
    billing: 'one-time',
    checkoutUrl: 'https://www.paypal.com/ncp/payment/XWNT5W4DVYANU',
  },
  {
    id: 'commerce',
    name: 'Sell Products or Services Online',
    internalName: 'E-Commerce Setup',
    price: 'Starting at $399',
    priceValue: 399,
    description:
      'Add online selling features like product pages, checkout, payments, and digital delivery.',
    includes: ['Product catalog', 'Cart and checkout', 'Payment setup', 'Order notifications'],
    bestFor: 'Businesses that want to take payments, sell products, or accept deposits online.',
    billing: 'one-time',
    checkoutUrl: 'https://www.paypal.com/ncp/payment/ZYQ7E2X8VHTHQ',
  },
  {
    id: 'copy',
    name: 'Website Copy & Content Help',
    internalName: 'Content Creation',
    price: 'Starting at $199',
    priceValue: 199,
    description:
      'Get clear, professional website copy for your homepage, services, about page, and CTAs.',
    includes: ['Homepage copy', 'Service page copy', 'About page writing', 'Call-to-action support'],
    bestFor: 'Businesses that need help writing clear, confident website content.',
    billing: 'one-time',
    checkoutUrl: 'https://www.paypal.com/ncp/payment/P494K8KN2S26A',
  },
  {
    id: 'care',
    name: 'Keep My Website Updated',
    internalName: 'Website Care Plan',
    price: 'Starting at $49/month',
    priceValue: 49,
    description: 'Ongoing support for updates, backups, security, and keeping your site running smoothly.',
    includes: ['Website monitoring', 'Security checks', 'Backups', 'Minor content updates'],
    bestFor: 'Businesses that want support after launch and prefer not to manage updates themselves.',
    billing: 'monthly',
    checkoutUrl: 'https://www.paypal.com/ncp/payment/5CMLKVTLKLSEQ',
  },
  {
    id: 'care-plus',
    name: 'Priority Website Care',
    internalName: 'Priority Care Subscription',
    price: 'Starting at $100/month',
    priceValue: 100,
    description: 'Higher-touch monthly support for businesses that want faster updates, ongoing maintenance, and more direct help.',
    includes: ['Website monitoring', 'Security checks', 'Backups', 'Minor content updates', 'Priority support'],
    bestFor: 'Businesses that want a more hands-on monthly support plan.',
    billing: 'monthly',
    checkoutUrl: 'https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=P-43R40579GM460452WNI3MFHY',
  },
];
