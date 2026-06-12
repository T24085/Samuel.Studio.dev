export type DnaGalleryItem = {
  id: string;
  number: string;
  title: string;
  description: string;
  image: string;
};

const baseUrl = import.meta.env.BASE_URL;
const mockupImages = import.meta.glob('../../Mockups/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const mockupAsset = (fileName: string) => {
  const image = mockupImages[`../../Mockups/${fileName}`];

  if (!image) {
    throw new Error(`Missing mockup asset: ${fileName}`);
  }

  return image;
};

const wheelGallerySource = [
  {
    id: 'dna-01',
    number: '01',
    title: 'Food Editorial',
    description: 'Warm, food-led promo site with playful product photography and soft contrast.',
    image: `${baseUrl}dna-gallery/01.png`,
  },
  {
    id: 'dna-02',
    number: '02',
    title: 'Studio Launch',
    description: 'Dark luxury layout with structured cards and a polished agency feel.',
    image: `${baseUrl}dna-gallery/02.png`,
  },
  {
    id: 'dna-03',
    number: '03',
    title: 'Tactical Hero',
    description: 'High-contrast tactical landing page with a hard-edged hero and feature blocks.',
    image: `${baseUrl}dna-gallery/03.png`,
  },
  {
    id: 'dna-04',
    number: '04',
    title: 'Competition Build',
    description: 'Performance-focused product page with a heavier, gear-driven composition.',
    image: `${baseUrl}dna-gallery/04.png`,
  },
  {
    id: 'dna-05',
    number: '05',
    title: 'Gun Guys',
    description: 'Cinema-style brand homepage with bold typography and restrained motion.',
    image: `${baseUrl}dna-gallery/05.png`,
  },
  {
    id: 'dna-06',
    number: '06',
    title: 'Faith Ministry',
    description: 'Bright church landing page with red accents and a welcoming service hierarchy.',
    image: `${baseUrl}dna-gallery/06.png`,
  },
  {
    id: 'dna-07',
    number: '07',
    title: 'Faith Family',
    description: 'Faith-centered storefront with clean white space and devotional product framing.',
    image: `${baseUrl}dna-gallery/07.png`,
  },
  {
    id: 'dna-11',
    number: '11',
    title: 'Warrior Fitness',
    description: 'Fitness brand with aggressive gold-on-black positioning and bold hierarchy.',
    image: `${baseUrl}dna-gallery/11.png`,
  },
  {
    id: 'dna-12',
    number: '12',
    title: 'Supplement Store',
    description: 'Minimal ecommerce layout with black packaging and premium lighting.',
    image: `${baseUrl}dna-gallery/12.png`,
  },
  {
    id: 'dna-13',
    number: '13',
    title: 'Aurora Warm',
    description: 'Fashion portrait layout with warm orange accents and editorial framing.',
    image: `${baseUrl}dna-gallery/13.png`,
  },
  {
    id: 'dna-14',
    number: '14',
    title: 'Aurora Mono',
    description: 'Monochrome fashion study with stark lighting and high-end editorial tone.',
    image: `${baseUrl}dna-gallery/14.png`,
  },
  {
    id: 'dna-15',
    number: '15',
    title: 'Streetwear Drop',
    description: 'Streetwear drop page with oversized type and dense product merchandising.',
    image: `${baseUrl}dna-gallery/15.png`,
  },
] as const;

export const dnaGalleryItems: DnaGalleryItem[] = wheelGallerySource.map((item) => item);
