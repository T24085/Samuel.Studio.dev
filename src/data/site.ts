export const intakeFormUrl =
  'https://docs.google.com/forms/d/e/1FAIpQLScCqxvBZ6NTmwh-qyphZyjKzdhz3-jouihSZjAXhRMkBaRpxw/viewform?usp=header';

export const emailAddress = 'capture@smauel.studio';

export type SiteKey = 'samuel-studio-dev' | 'samuel-studio' | 'samuel-studio-columbia';

function resolveSiteKeyFromText(value: string) {
  const lower = value.toLowerCase();

  if (!lower || lower === 'localhost' || lower === '127.0.0.1' || lower === '::1' || lower.includes('dev')) {
    return 'samuel-studio-dev' as const;
  }

  if (lower.includes('columbia') || lower.includes('colombia')) {
    return 'samuel-studio-columbia' as const;
  }

  if (lower.includes('samuel.studio') || lower.includes('samuelstudio')) {
    return 'samuel-studio' as const;
  }

  return 'samuel-studio-dev' as const;
}

export function resolveSiteKeyFromHostname(hostname: string) {
  return resolveSiteKeyFromText(hostname);
}

export function resolveSiteKeyFromPageUrl(pageUrl: string) {
  if (!pageUrl) {
    return 'samuel-studio-dev' as const;
  }

  try {
    const url = new URL(pageUrl);
    const pathname = decodeURIComponent(url.pathname || '').replace(/\/+/g, '/').toLowerCase();
    const candidate = `${url.hostname.toLowerCase()}${pathname}`;

    if (candidate.includes('columbia') || candidate.includes('colombia')) {
      return 'samuel-studio-columbia' as const;
    }

    if (candidate.includes('dev')) {
      return 'samuel-studio-dev' as const;
    }

    if (candidate.includes('samuel.studio') || candidate.includes('samuelstudio')) {
      return 'samuel-studio' as const;
    }

    return resolveSiteKeyFromHostname(url.hostname);
  } catch {
    return resolveSiteKeyFromText(pageUrl);
  }
}

export function resolveCurrentSiteKey() {
  if (typeof window === 'undefined') {
    return 'samuel-studio-dev' as const;
  }

  return import.meta.env.VITE_SITE_KEY?.trim() || resolveSiteKeyFromPageUrl(window.location.href);
}

export const siteKey = resolveCurrentSiteKey();

export type SitePresentation = {
  key: SiteKey;
  label: string;
  accent: string;
  accentSoft: string;
  accentStrong: string;
  assistantBubbleStart: string;
  assistantBubbleEnd: string;
  userBubbleStart: string;
  userBubbleEnd: string;
  border: string;
  glow: string;
};

const sitePresentationMap: Record<SiteKey, SitePresentation> = {
  'samuel-studio-dev': {
    key: 'samuel-studio-dev',
    label: 'Samuel Studio Dev',
    accent: '#cf5c36',
    accentSoft: '#efc88b',
    accentStrong: '#9e4223',
    assistantBubbleStart: 'rgba(207, 92, 54, 0.18)',
    assistantBubbleEnd: 'rgba(255, 255, 255, 0.05)',
    userBubbleStart: 'rgba(207, 92, 54, 0.96)',
    userBubbleEnd: 'rgba(145, 61, 35, 0.96)',
    border: 'rgba(239, 200, 139, 0.22)',
    glow: 'rgba(207, 92, 54, 0.18)',
  },
  'samuel-studio': {
    key: 'samuel-studio',
    label: 'Samuel Studio',
    accent: '#cf5c36',
    accentSoft: '#efc88b',
    accentStrong: '#9e4223',
    assistantBubbleStart: 'rgba(207, 92, 54, 0.18)',
    assistantBubbleEnd: 'rgba(255, 255, 255, 0.05)',
    userBubbleStart: 'rgba(207, 92, 54, 0.96)',
    userBubbleEnd: 'rgba(145, 61, 35, 0.96)',
    border: 'rgba(239, 200, 139, 0.24)',
    glow: 'rgba(207, 92, 54, 0.18)',
  },
  'samuel-studio-columbia': {
    key: 'samuel-studio-columbia',
    label: 'Samuel Studio Columbia',
    accent: '#6ee7ff',
    accentSoft: '#bae6fd',
    accentStrong: '#0891b2',
    assistantBubbleStart: 'rgba(110, 231, 255, 0.16)',
    assistantBubbleEnd: 'rgba(255, 255, 255, 0.05)',
    userBubbleStart: 'rgba(56, 189, 248, 0.96)',
    userBubbleEnd: 'rgba(14, 116, 144, 0.96)',
    border: 'rgba(110, 231, 255, 0.24)',
    glow: 'rgba(110, 231, 255, 0.18)',
  },
};

export function getSitePresentation(currentSiteKey: SiteKey = siteKey) {
  return sitePresentationMap[currentSiteKey] || sitePresentationMap['samuel-studio-dev'];
}

export const navItems = [
  { label: 'Home', href: '#home' },
  { label: 'Gallery', href: '#gallery' },
  { label: 'Work', href: '#work' },
  { label: 'Process', href: '#process' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Contact', href: '#contact' },
] as const;
