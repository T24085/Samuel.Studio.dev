const baseUrl = import.meta.env.BASE_URL;

export const assets = {
  heroBanner: `${baseUrl}assets/HeroBanner.png`,
  heroVideo: `${baseUrl}assets/HeroVideo.mp4`,
  contactBanner: `${baseUrl}assets/ContactBanner.png`,
  profile: `${baseUrl}assets/Profile.png`,
  novaAvatar: `${baseUrl}assets/NovaHeadshot.png`,
  studioCard: `${baseUrl}assets/StudioCard.png`,
  logo: `${baseUrl}assets/samuel-studio-logo.png`,
} as const;
