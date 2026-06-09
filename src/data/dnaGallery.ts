export type DnaGalleryItem = {
  id: string;
  number: string;
  title: string;
  description: string;
  image: string;
};

const wheelMockups = import.meta.glob('../../MocksforWheel/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const wheelAsset = (fileName: string) => {
  const image = wheelMockups[`../../MocksforWheel/${fileName}`];

  if (!image) {
    throw new Error(`Missing wheel mockup: ${fileName}`);
  }

  return image;
};

const wheelGallerySource = [
  {
    id: 'dna-01',
    number: '01',
    title: 'Food Editorial',
    description: 'Warm, food-led promo site with playful product photography and soft contrast.',
    file: 'ChatGPT Image Jun 8, 2026, 10_18_00 AM.png',
  },
  {
    id: 'dna-02',
    number: '02',
    title: 'Studio Launch',
    description: 'Dark luxury layout with structured cards and a polished agency feel.',
    file: 'ChatGPT Image Jun 8, 2026, 10_19_04 AM.png',
  },
  {
    id: 'dna-03',
    number: '03',
    title: 'Tactical Hero',
    description: 'High-contrast tactical landing page with a hard-edged hero and feature blocks.',
    file: 'ChatGPT Image Jun 8, 2026, 10_19_27 AM.png',
  },
  {
    id: 'dna-04',
    number: '04',
    title: 'Competition Build',
    description: 'Performance-focused product page with a heavier, gear-driven composition.',
    file: 'ChatGPT Image Jun 8, 2026, 10_20_02 AM.png',
  },
  {
    id: 'dna-05',
    number: '05',
    title: 'Gun Guys',
    description: 'Cinema-style brand homepage with bold typography and restrained motion.',
    file: 'ChatGPT Image Jun 8, 2026, 10_20_25 AM.png',
  },
  {
    id: 'dna-06',
    number: '06',
    title: 'Faith Ministry',
    description: 'Bright church landing page with red accents and a welcoming service hierarchy.',
    file: 'ChatGPT Image Jun 8, 2026, 10_20_40 AM.png',
  },
  {
    id: 'dna-07',
    number: '07',
    title: 'Faith Family',
    description: 'Faith-centered storefront with clean white space and devotional product framing.',
    file: 'ChatGPT Image Jun 8, 2026, 10_20_59 AM.png',
  },
  {
    id: 'dna-08',
    number: '08',
    title: 'Split Layout',
    description: 'Split-screen business homepage with dashboard and lifestyle sections.',
    file: 'ChatGPT Image Jun 8, 2026, 10_21_29 AM.png',
  },
  {
    id: 'dna-09',
    number: '09',
    title: 'Church Landing',
    description: 'Dark ministry homepage with a centered message and warm content blocks.',
    file: 'ChatGPT Image Jun 8, 2026, 10_21_52 AM.png',
  },
  {
    id: 'dna-10',
    number: '10',
    title: 'Dessert Campaign',
    description: 'Dessert campaign with multiple product shots and cheerful pastel branding.',
    file: 'ChatGPT Image Jun 9, 2026, 11_03_10 AM.png',
  },
  {
    id: 'dna-11',
    number: '11',
    title: 'Warrior Fitness',
    description: 'Fitness brand with aggressive gold-on-black positioning and bold hierarchy.',
    file: 'ChatGPT Image Jun 9, 2026, 11_03_53 AM.png',
  },
  {
    id: 'dna-12',
    number: '12',
    title: 'Supplement Store',
    description: 'Minimal ecommerce layout with black packaging and premium lighting.',
    file: 'ChatGPT Image Jun 9, 2026, 11_04_26 AM.png',
  },
  {
    id: 'dna-13',
    number: '13',
    title: 'Aurora Warm',
    description: 'Fashion portrait layout with warm orange accents and editorial framing.',
    file: 'ChatGPT Image Jun 9, 2026, 11_04_38 AM.png',
  },
  {
    id: 'dna-14',
    number: '14',
    title: 'Aurora Mono',
    description: 'Monochrome fashion study with stark lighting and high-end editorial tone.',
    file: 'ChatGPT Image Jun 9, 2026, 11_04_45 AM.png',
  },
  {
    id: 'dna-15',
    number: '15',
    title: 'Streetwear Drop',
    description: 'Streetwear drop page with oversized type and dense product merchandising.',
    file: 'ChatGPT Image Jun 9, 2026, 11_05_10 AM.png',
  },
] as const;

export const dnaGalleryItems: DnaGalleryItem[] = wheelGallerySource.map(({ file, ...item }) => ({
  ...item,
  image: wheelAsset(file),
}));
