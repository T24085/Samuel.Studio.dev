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
  cartAddToCartId?: string;
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
};

export const packages: Package[] = [
  {
    id: 'starter',
    title: 'Starter Website',
    price: 'Starting at $499',
    priceValue: 499,
    description: 'A clean, professional website for new businesses or simple online presence needs.',
    bestFor: ['New businesses', 'Contractors', 'Lawn care', 'Churches', 'Small organizations', 'Side businesses'],
    includes: [
      '1-3 pages',
      'Mobile-friendly design',
      'Contact form',
      'Basic SEO setup',
      'Google Maps or location section',
      'Fast-loading modern layout',
      'Basic brand styling',
      'Call-to-action buttons',
    ],
    cta: 'Start My Website',
    customerFacingExplanation:
      'Perfect if you need a simple, professional website that helps people find you, understand what you offer, and contact you.',
    cartAddToCartId: 'TS4B6ND3JD9RQ',
  },
  {
    id: 'professional',
    title: 'Professional Website',
    price: 'Starting at $999',
    priceValue: 999,
    description: 'A full business website built to show your services, build trust, and turn visitors into customers.',
    bestFor: ['Established local businesses', 'Restaurants', 'Retail stores', 'Service companies', 'Churches with multiple ministries', 'Creators with portfolios'],
    includes: [
      'Up to 8-10 pages',
      'Custom homepage',
      'Services pages',
      'About page',
      'Contact page',
      'Gallery or portfolio section',
      'Social media links',
      'Contact form',
      'Stronger SEO setup',
      'Mobile responsive design',
      'More detailed copywriting support',
      'Clear calls-to-action throughout the site',
    ],
    cta: 'Build My Business Website',
    customerFacingExplanation:
      'Best for businesses that need a complete online presence with enough room to explain services, show photos, build trust, and generate leads.',
    featured: true,
    cartAddToCartId: 'XWNT5W4DVYANU',
  },
  {
    id: 'growth',
    title: 'Business Growth Website',
    price: 'Starting at $1,999',
    priceValue: 1999,
    description: 'A premium website built for businesses that want leads, automation, booking, advanced content, or stronger online growth.',
    bestFor: ['Businesses running ads', 'Companies that rely on online leads', 'Service businesses that want booking', 'Brands launching a campaign', 'Businesses that need automation', 'Premium custom design'],
    includes: [
      'Everything in Professional Website',
      'Advanced custom design',
      'Lead capture sections',
      'Conversion-focused layout',
      'Booking or quote request flow',
      'Advanced SEO structure',
      'Analytics setup',
      'AI lead assistant option',
      'More advanced animations and interactions',
      'Campaign landing pages if needed',
      'Growth-focused strategy',
    ],
    cta: 'Grow My Business Online',
    customerFacingExplanation:
      'Best for businesses that want more than a website. They want a sales tool that helps capture leads, book customers, and grow online.',
    cartAddToCartId: 'WJQGNAXVCD9T6',
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
  },
  {
    id: 'lead-assistant',
    name: 'Never Miss a Lead',
    internalName: 'AI Lead Assistant',
    price: 'Starting at $299',
    priceValue: 299,
    description:
      'Add an AI-powered assistant that can answer common questions, collect customer info, and help capture leads even when you are busy.',
    includes: ['AI chat assistant', 'FAQ responses', 'Lead capture flow', 'Business-specific setup'],
    bestFor: 'Service businesses, churches, consultants, and local brands that want help after hours.',
    billing: 'one-time',
  },
  {
    id: 'booking',
    name: 'Let Customers Schedule Online',
    internalName: 'Booking System',
    price: 'Starting at $199',
    priceValue: 199,
    description:
      'Allow customers to request appointments, schedule services, or book consultations directly from your website.',
    includes: ['Booking calendar', 'Confirmation flow', 'Appointment reminders', 'Calendar integration'],
    bestFor: 'Businesses that book consultations, appointments, or service visits.',
    billing: 'one-time',
  },
  {
    id: 'commerce',
    name: 'Sell Products or Services Online',
    internalName: 'E-Commerce Setup',
    price: 'Starting at $399',
    priceValue: 399,
    description:
      'Add online selling features for products, services, deposits, digital items, or simple checkout flows.',
    includes: ['Product catalog', 'Cart and checkout', 'Payment setup', 'Order notifications'],
    bestFor: 'Businesses that want to take payments, sell products, or accept deposits online.',
    billing: 'one-time',
  },
  {
    id: 'copy',
    name: 'Website Copy & Content Help',
    internalName: 'Content Creation',
    price: 'Starting at $199',
    priceValue: 199,
    description:
      'Get help writing clear, professional website text for your homepage, services, about page, and calls-to-action.',
    includes: ['Homepage copy', 'Service page copy', 'About page writing', 'Call-to-action support'],
    bestFor: 'Businesses that need help writing clear, confident website content.',
    billing: 'one-time',
  },
  {
    id: 'care',
    name: 'Keep My Website Updated',
    internalName: 'Website Care Plan',
    price: 'Starting at $49/month',
    priceValue: 49,
    description: 'Ongoing support for updates, small changes, backups, monitoring, and keeping your website fresh after launch.',
    includes: ['Website monitoring', 'Security checks', 'Backups', 'Minor content updates'],
    bestFor: 'Businesses that want support after launch and prefer not to manage updates themselves.',
    billing: 'monthly',
  },
];
