const siteDefinitions = [
  {
    key: 'samuel-studio-dev',
    label: 'Samuel Studio Dev',
    folderName: 'Samuel Studio Dev',
  },
  {
    key: 'samuel-studio',
    label: 'Samuel Studio',
    folderName: 'Samuel Studio',
  },
  {
    key: 'samuel-studio-columbia',
    label: 'Samuel Studio Columbia',
    folderName: 'Samuel Studio Columbia',
  },
  {
    key: 'emmanuel-church',
    label: 'Emmanuel Church',
    folderName: 'Emmanuel Church',
  },
];

const defaultSiteKey = 'samuel-studio-dev';

function cleanText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function listSiteDefinitions() {
  return siteDefinitions.map((site) => ({ ...site }));
}

export function getSiteDefinition(siteKey) {
  const normalized = normalizeSiteKey(siteKey);
  return siteDefinitions.find((site) => site.key === normalized) || siteDefinitions[0];
}

export function normalizeSiteKey(siteKey) {
  const normalized = cleanText(siteKey, '').toLowerCase();
  if (!normalized) {
    return defaultSiteKey;
  }

  const exactMatch = siteDefinitions.find((site) => site.key === normalized);
  if (exactMatch) {
    return exactMatch.key;
  }

  if (normalized.includes('columbia')) {
    return 'samuel-studio-columbia';
  }

  if (normalized.includes('colombia')) {
    return 'samuel-studio-columbia';
  }

  if (normalized.includes('emmanuel') || normalized.includes('ecabilene') || normalized.includes('church')) {
    return 'emmanuel-church';
  }

  if (normalized.includes('dev') || normalized.includes('localhost') || normalized.includes('127.0.0.1') || normalized.includes('::1')) {
    return 'samuel-studio-dev';
  }

  if (normalized.includes('samuel') && normalized.includes('studio')) {
    return 'samuel-studio';
  }

  return defaultSiteKey;
}

export function inferSiteKeyFromPageUrl(pageUrl) {
  if (!pageUrl || typeof pageUrl !== 'string') {
    return defaultSiteKey;
  }

  try {
    const url = new URL(pageUrl);
    const hostname = url.hostname.toLowerCase();
    const pathname = decodeURIComponent(url.pathname || '').replace(/\/+/g, '/').toLowerCase();
    const candidate = `${hostname}${pathname}`;

    if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return 'samuel-studio-dev';
    }

    if (candidate.includes('columbia') || candidate.includes('colombia')) {
      return 'samuel-studio-columbia';
    }

    if (candidate.includes('emmanuel') || candidate.includes('ecabilene') || candidate.includes('church')) {
      return 'emmanuel-church';
    }

    if (candidate.includes('dev')) {
      return 'samuel-studio-dev';
    }

    if (candidate.includes('samuel.studio') || candidate.includes('samuelstudio')) {
      return 'samuel-studio';
    }

    if (hostname.endsWith('.dev') || hostname.includes('dev')) {
      return 'samuel-studio-dev';
    }
  } catch {
    // Keep default.
  }

  return defaultSiteKey;
}

export function resolveSiteKey(siteKey, pageUrl) {
  const normalized = normalizeSiteKey(siteKey);
  if (normalized !== defaultSiteKey || cleanText(siteKey, '')) {
    return normalized;
  }

  return inferSiteKeyFromPageUrl(pageUrl);
}

export function getSiteLabel(siteKey) {
  return getSiteDefinition(siteKey).label;
}

export function getSiteFolderName(siteKey) {
  return getSiteDefinition(siteKey).folderName;
}

export function getDefaultSiteKey() {
  return defaultSiteKey;
}
