import type { LucideIcon } from 'lucide-react';
import {
  BoxSelect,
  Building2,
  Church,
  Flame,
  Paintbrush2,
  Sparkles,
  Ticket,
  WandSparkles,
} from 'lucide-react';
import boldMaximalistMockup from '../../mockups/Bold Maximalist.png';
import corporateProfessionalMockup from '../../mockups/Corporate Professional.png';
import eventCompetitionMockup from '../../mockups/Event Competition.png';
import experimentalBrutalistMockup from '../../mockups/Experimental Brutalist.png';
import faithMinistryMockup from '../../mockups/Faith Ministry.png';
import luxuryEditorialMockup from '../../mockups/Luxury Editorial.png';
import minimalistMockup from '../../mockups/Minimalist.png';
import modernMotionMockup from '../../mockups/Modern Motion.png';

export type StyleItem = {
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  preview: string;
  image: string;
  featured?: boolean;
};

export const styleItems: StyleItem[] = [
  {
    title: 'Luxury Editorial',
    description:
      'Elegant, image-led, and composition-first. Best for photographers, models, fashion brands, salons, studios, and premium services.',
    icon: Sparkles,
    accent: 'violet',
    preview: 'Magazine rhythm',
    image: luxuryEditorialMockup,
    featured: true,
  },
  {
    title: 'Minimalist',
    description:
      'Clean, simple, and focused on clarity. Best for businesses that want a polished and professional site without distractions.',
    icon: BoxSelect,
    accent: 'slate',
    preview: 'Quiet structure',
    image: minimalistMockup,
  },
  {
    title: 'Bold / Maximalist',
    description:
      'Loud, colorful, and full of personality. Best for brands that want to stand out and make a strong first impression.',
    icon: Flame,
    accent: 'fuchsia',
    preview: 'High contrast',
    image: boldMaximalistMockup,
  },
  {
    title: 'Corporate / Professional',
    description:
      'Clean, trustworthy, and business-ready. Best for contractors, consultants, service businesses, finance, real estate, and local companies.',
    icon: Building2,
    accent: 'blue',
    preview: 'Trust-first',
    image: corporateProfessionalMockup,
  },
  {
    title: 'Modern Motion',
    description:
      'Smooth animations and interactive sections that make the site feel more alive. Best for brands that want a modern, premium experience.',
    icon: WandSparkles,
    accent: 'violet',
    preview: 'Motion-led',
    image: modernMotionMockup,
  },
  {
    title: 'Experimental / Brutalist',
    description:
      'Unconventional, artistic, and edgy. Best for creative brands, music, gaming, fashion, art, or projects that want to break the mold.',
    icon: Paintbrush2,
    accent: 'amber',
    preview: 'Rule breaking',
    image: experimentalBrutalistMockup,
  },
  {
    title: 'Faith / Ministry',
    description:
      'Warm, welcoming, and mission-focused. Best for churches, ministries, nonprofits, and community organizations.',
    icon: Church,
    accent: 'emerald',
    preview: 'Mission centered',
    image: faithMinistryMockup,
  },
  {
    title: 'Event / Competition',
    description:
      'Clear, energetic, and action-focused. Best for competitions, tournaments, registrations, and community events.',
    icon: Ticket,
    accent: 'rose',
    preview: 'Action ready',
    image: eventCompetitionMockup,
  },
];
