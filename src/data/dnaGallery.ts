export type DnaGalleryItem = {
  id: string;
  number: string;
  title: string;
  description: string;
  image: string;
};

const baseUrl = import.meta.env.BASE_URL;

const gallerySource = [
  {
    id: 'dna-01',
    number: '01',
    title: 'Trendel Lumber Co.',
    description: 'Red-and-black lumber supply homepage with a warehouse-scale hero and strong trade credentials.',
    image: `${baseUrl}dna-gallery/01.png`,
  },
  {
    id: 'dna-02',
    number: '02',
    title: 'Summit Construction',
    description: 'Clean construction landing page with a bright residential hero and service cards.',
    image: `${baseUrl}dna-gallery/02.png`,
  },
  {
    id: 'dna-03',
    number: '03',
    title: 'Pinnacle Roofing',
    description: 'Roofing homepage with a high-contrast house hero, service grid, and trust signals.',
    image: `${baseUrl}dna-gallery/03.png`,
  },
  {
    id: 'dna-04',
    number: '04',
    title: 'Prairie Auto Repair',
    description: 'Auto repair studio with a sharp service hero, compact offers, and local proof points.',
    image: `${baseUrl}dna-gallery/04.png`,
  },
  {
    id: 'dna-05',
    number: '05',
    title: 'Luna Boutique',
    description: 'Soft fashion storefront with elegant editorial photography and refined product rhythm.',
    image: `${baseUrl}dna-gallery/05.png`,
  },
  {
    id: 'dna-06',
    number: '06',
    title: 'Vero Ristorante',
    description: 'Warm restaurant homepage with an inviting hero, table booking flow, and menu highlights.',
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
    id: 'dna-08',
    number: '08',
    title: 'Modern Motion',
    description: 'Smooth, high-contrast website with a more experimental motion-led presentation.',
    image: `${baseUrl}dna-gallery/08.png`,
  },
  {
    id: 'dna-09',
    number: '09',
    title: 'Corporate Grid',
    description: 'Structured business layout with a dense card system and polished professional tone.',
    image: `${baseUrl}dna-gallery/09.png`,
  },
  {
    id: 'dna-10',
    number: '10',
    title: 'Studio Pattern',
    description: 'Editorial-style landing page with a layout that leans into rhythm and contrast.',
    image: `${baseUrl}dna-gallery/10.png`,
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

export const dnaGalleryItems: DnaGalleryItem[] = gallerySource.map((item) => item);
