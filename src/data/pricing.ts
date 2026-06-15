export type Package = {
  title: string;
  price: string;
  description: string;
  includes: string[];
  cta: string;
  checkoutUrl?: string;
  cartAddToCartId?: string;
  featured?: boolean;
};

export type AddOn = {
  name: string;
  price: string;
  description: string;
  includes: string[];
  bestFor: string;
};

export const packages: Package[] = [
  {
    title: 'Starter Landing Page',
    price: '$300 - $500',
    description: 'A focused single-page site that makes a strong first impression and drives inquiries.',
    includes: ['Hero-driven design', 'About + contact section', 'Mobile optimized', 'Fast load, clean structure', 'Launch-ready deployment'],
    cta: 'Add to Cart',
    cartAddToCartId: 'TS4B6ND3JD9RQ',
  },
  {
    title: 'Portfolio Website',
    price: '$600 - $1,000',
    description: 'A polished multi-page presence built to showcase your work and guide clients toward booking.',
    includes: ['Multi-page layout', 'Image galleries / portfolio system', 'Services or booking section', 'Brand styling + motion', 'Contact / inquiry integration'],
    cta: 'Add to Cart',
    cartAddToCartId: 'XWNT5W4DVYANU',
    featured: true,
  },
  {
    title: 'Brand / Campaign Website',
    price: 'Starting at $1,000+',
    description: 'A high-impact launch experience for brands that want scale and presence.',
    includes: ['Custom creative direction', 'Advanced layouts & transitions', 'Campaign storytelling structure', 'High-end visual presentation', 'Built to stand out and scale'],
    cta: 'Add to Cart',
    cartAddToCartId: 'WJQGNAXVCD9T6',
  },
];

export const addOns: AddOn[] = [
  {
    name: 'AI Lead Assistant',
    price: 'Starting at $299',
    description:
      'Never miss a potential customer. An AI-powered assistant works around the clock to answer questions, collect contact information, and help visitors find exactly what they are looking for.',
    includes: ['24/7 AI chat assistant', 'Business-specific training', 'Lead capture forms', 'FAQ automation', 'Contact form integration', 'Mobile-friendly experience'],
    bestFor: 'Service businesses, contractors, consultants, churches, and local businesses.',
  },
  {
    name: 'Search Engine Optimization (SEO)',
    price: 'Starting at $299',
    description:
      'Help your business appear higher in Google search results and attract more customers searching for your services online.',
    includes: ['Keyword optimization', 'Google indexing setup', 'Meta titles & descriptions', 'Performance improvements', 'Local SEO enhancements', 'Google Search Console setup'],
    bestFor: 'Any business looking to increase website traffic and generate more leads.',
  },
  {
    name: 'Online Booking & Scheduling',
    price: 'Starting at $249',
    description:
      'Allow customers to schedule appointments, consultations, and services directly from your website without phone calls or email exchanges.',
    includes: ['Online booking calendar', 'Automated confirmations', 'Appointment reminders', 'Availability management', 'Calendar integration', 'Mobile booking support'],
    bestFor: 'Salons, photographers, churches, consultants, coaches, medical offices, and service providers.',
  },
  {
    name: 'Online Store (E-Commerce)',
    price: 'Starting at $499',
    description:
      'Sell products online with a secure and professional shopping experience designed to turn visitors into customers.',
    includes: ['Product catalog', 'Shopping cart', 'Secure checkout', 'Payment processing setup', 'Inventory management', 'Order notifications', 'Mobile-friendly storefront'],
    bestFor: 'Retail stores, apparel brands, churches, creators, and businesses selling physical or digital products.',
  },
  {
    name: 'Content Creation Package',
    price: 'Starting at $299',
    description:
      'Professional website content written to clearly communicate your services, build trust, and encourage visitors to take action.',
    includes: ['Homepage copywriting', 'Service page content', 'About page writing', 'Call-to-action optimization', 'SEO-friendly formatting', 'Brand messaging assistance'],
    bestFor: 'Businesses that need help explaining what they do or want stronger website messaging.',
  },
  {
    name: 'Website Care Plan',
    price: '$49 / month',
    description: 'Keep your website secure, updated, and running smoothly while you focus on your business.',
    includes: ['Website monitoring', 'Security checks', 'Backup management', 'Performance reviews', 'Minor content updates', 'Priority support'],
    bestFor: 'Businesses that want ongoing support and peace of mind.',
  },
];
