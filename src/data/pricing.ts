export type Package = {
  title: string;
  price: string;
  description: string;
  includes: string[];
  cta: string;
  checkoutUrl?: string;
  featured?: boolean;
};

export type AddOn = {
  name: string;
  price: string;
};

export const packages: Package[] = [
  {
    title: 'Starter Landing Page',
    price: '$300 - $500',
    description: 'A focused single-page site that makes a strong first impression and drives inquiries.',
    includes: ['Hero-driven design', 'About + contact section', 'Mobile optimized', 'Fast load, clean structure', 'Launch-ready deployment'],
    cta: 'Buy Now',
    checkoutUrl: 'https://www.paypal.com/ncp/payment/N7WNFPBA5GSLS',
  },
  {
    title: 'Portfolio Website',
    price: '$600 - $1,000',
    description: 'A polished multi-page presence built to showcase your work and guide clients toward booking.',
    includes: ['Multi-page layout', 'Image galleries / portfolio system', 'Services or booking section', 'Brand styling + motion', 'Contact / inquiry integration'],
    cta: 'Buy Now',
    checkoutUrl: 'https://www.paypal.com/ncp/payment/MVEQMSVCGDFQL',
    featured: true,
  },
  {
    title: 'Brand / Campaign Website',
    price: 'Starting at $1,000+',
    description: 'A high-impact launch experience for brands that want scale and presence.',
    includes: ['Custom creative direction', 'Advanced layouts & transitions', 'Campaign storytelling structure', 'High-end visual presentation', 'Built to stand out and scale'],
    cta: 'Book Now',
  },
];

export const addOns: AddOn[] = [
  { name: 'Logo & brand identity', price: '$150 - $600' },
  { name: 'Photo editing / retouching', price: '$50 - $300' },
  { name: 'Instagram content packages', price: '$150 - $400' },
  { name: 'Booking + inquiry systems', price: '$150 - $400' },
  { name: 'Gallery / CMS integrations', price: '$100 - $250' },
  { name: 'Ongoing updates / support', price: '$99 / mo' },
];
