const baseUrl = import.meta.env.BASE_URL;

export const assets = {
  heroBanner: `${baseUrl}assets/HeroBanner.png`,
  contactBanner: `${baseUrl}assets/ContactBanner.png`,
  profile: `${baseUrl}assets/Profile.png`,
  studioCard: `${baseUrl}assets/StudioCard.png`,
} as const;
