import boldMaximalistMockup from '../../mockups/Bold Maximalist.png';
import corporateProfessionalMockup from '../../mockups/Corporate Professional.png';
import eventCompetitionMockup from '../../mockups/Event Competition.png';
import experimentalBrutalistMockup from '../../mockups/Experimental Brutalist.png';
import faithMinistryMockup from '../../mockups/Faith Ministry.png';
import luxuryEditorialMockup from '../../mockups/Luxury Editorial.png';
import minimalistMockup from '../../mockups/Minimalist.png';
import modernMotionMockup from '../../mockups/Modern Motion.png';

const baseUrl = import.meta.env.BASE_URL;

const asset = (path: string) => `${baseUrl}${path}`;

export type DnaGalleryItem = {
  id: string;
  number: string;
  title: string;
  description: string;
  image: string;
};

export const dnaGalleryItems: DnaGalleryItem[] = [
  {
    id: 'dna-01',
    number: '01',
    title: 'Luxury Editorial',
    description: 'Cinematic composition with premium spacing and image-led structure.',
    image: luxuryEditorialMockup,
  },
  {
    id: 'dna-02',
    number: '02',
    title: 'Minimalist',
    description: 'Clear, quiet structure built around restraint and readability.',
    image: minimalistMockup,
  },
  {
    id: 'dna-03',
    number: '03',
    title: 'Bold Maximalist',
    description: 'High contrast presentation with saturated energy and personality.',
    image: boldMaximalistMockup,
  },
  {
    id: 'dna-04',
    number: '04',
    title: 'Corporate Professional',
    description: 'Trust-first layout for service businesses and commercial brands.',
    image: corporateProfessionalMockup,
  },
  {
    id: 'dna-05',
    number: '05',
    title: 'Modern Motion',
    description: 'Movement-led framing with premium rhythm and polished transitions.',
    image: modernMotionMockup,
  },
  {
    id: 'dna-06',
    number: '06',
    title: 'Experimental Brutalist',
    description: 'Angular visuals with a more raw and unconventional edge.',
    image: experimentalBrutalistMockup,
  },
  {
    id: 'dna-07',
    number: '07',
    title: 'Faith Ministry',
    description: 'Warm, welcoming presentation for ministries and community groups.',
    image: faithMinistryMockup,
  },
  {
    id: 'dna-08',
    number: '08',
    title: 'Event Competition',
    description: 'Action-focused framing for registrations, events, and campaigns.',
    image: eventCompetitionMockup,
  },
  {
    id: 'dna-09',
    number: '09',
    title: 'Studio Card',
    description: 'Compact brand card with bold contrast and strong product focus.',
    image: asset('assets/StudioCard.png'),
  },
  {
    id: 'dna-10',
    number: '10',
    title: 'Broadside',
    description: 'Dark, cinematic layout with a heavier character-driven tone.',
    image: asset('assets/project-previews/broadside.png'),
  },
  {
    id: 'dna-11',
    number: '11',
    title: 'Emmanuel Church',
    description: 'Friendly ministry presentation with simple, trustworthy rhythm.',
    image: asset('assets/project-previews/emmanuel-church.png'),
  },
  {
    id: 'dna-12',
    number: '12',
    title: 'Iron Faith',
    description: 'Bold faith-based brand study with athletic, high-contrast energy.',
    image: asset('assets/project-previews/iron-faith.png'),
  },
  {
    id: 'dna-13',
    number: '13',
    title: 'Samuel Studio Colombia',
    description: 'Luxury studio direction with editorial balance and visual polish.',
    image: asset('assets/project-previews/samuel-studio-colombia.png'),
  },
  {
    id: 'dna-14',
    number: '14',
    title: 'Samuel Studio',
    description: 'Core brand presentation with cinematic structure and premium spacing.',
    image: asset('assets/project-previews/samuel-studio.png'),
  },
  {
    id: 'dna-15',
    number: '15',
    title: 'X-Ring Classic',
    description: 'Competition-focused layout with clean hierarchy and clear action.',
    image: asset('assets/project-previews/x-ring-classic.png'),
  },
];
