const baseUrl = import.meta.env.BASE_URL;

export type Project = {
  title: string;
  category: string;
  description: string;
  url: string;
  accent: string;
  previewImage: string;
  legacy?: boolean;
};

export const featuredProjects: Project[] = [
  {
    title: 'Samuel Studio',
    category: 'Creative Portfolio',
    description: 'Creative agency portfolio built with cinematic visuals, bold motion, and premium brand presentation.',
    url: 'https://t24085.github.io/Samuel.Studio/',
    accent: 'violet',
    previewImage: `${baseUrl}assets/project-previews/samuel-studio.png`,
  },
  {
    title: 'Samuel Studio Colombia',
    category: 'Creative Portfolio',
    description: 'Luxury photography and creative studio concept with editorial layouts and high-end visual storytelling.',
    url: 'https://t24085.github.io/Samuel.Colombia/',
    accent: 'purple',
    previewImage: `${baseUrl}assets/project-previews/samuel-studio-colombia.png`,
  },
  {
    title: 'Trendel Lumber',
    category: 'Contractor / Commerce',
    description: 'Bold lumber and contractor storefront with a high-energy merchandising layout and clear product pathways.',
    url: 'https://t24085.github.io/Trendel-Lumber/',
    accent: 'indigo',
    previewImage: `${baseUrl}assets/project-previews/trendel-lumber.jpg`,
  },
  {
    title: 'TIR',
    category: 'Industrial / Inspection',
    description: 'Inspection and infrastructure website with a sharp, utility-first layout built around trust and momentum.',
    url: 'https://t24085.github.io/TIR/',
    accent: 'amber',
    previewImage: `${baseUrl}assets/project-previews/tir.jpg`,
  },
  {
    title: 'Hello Property Management',
    category: 'Property Management',
    description: 'Warm, polished property management site focused on tenant care, trust, and straightforward lead capture.',
    url: 'https://t24085.github.io/hellopropertymanagement/#/',
    accent: 'rose',
    previewImage: `${baseUrl}assets/project-previews/hello-property-management.jpg`,
  },
  {
    title: 'Emmanuel Church',
    category: 'Faith / Ministry',
    description: 'Warm, polished church website designed for community trust, clarity, and simple engagement.',
    url: 'https://t24085.github.io/Emmanuel-Church/',
    accent: 'emerald',
    previewImage: `${baseUrl}assets/project-previews/emmanuel-church.png`,
  },
];

export const archiveProjects: Project[] = [
  {
    title: 'Broadside',
    category: 'Brand / Agency',
    description: 'Gaming community website concept with dark cinematic branding and strong character-driven presentation.',
    url: 'https://t24085.github.io/Broadside/',
    accent: 'indigo',
    previewImage: `${baseUrl}assets/project-previews/broadside.png`,
    legacy: true,
  },
  {
    title: 'Iron Faith',
    category: 'Fitness / Brand',
    description: 'Faith-based fitness and apparel website with bold Christian warrior energy and merchandise potential.',
    url: 'https://t24085.github.io/Iron-Faith/',
    accent: 'amber',
    previewImage: `${baseUrl}assets/project-previews/iron-faith.png`,
    legacy: true,
  },
  {
    title: 'X-Ring Classic',
    category: 'Events / Entertainment',
    description: 'Competition event website for .22LR shooting events, built around clarity, trust, and registration flow.',
    url: 'https://t24085.github.io/X-Ring-Classic/',
    accent: 'rose',
    previewImage: `${baseUrl}assets/project-previews/x-ring-classic.png`,
    legacy: true,
  },
];

export const allProjects: Project[] = [...featuredProjects, ...archiveProjects];
