import { useEffect, useMemo, useState } from 'react';
import { FeaturedWork } from './components/FeaturedWork';
import { Footer } from './components/Footer';
import { FloatingCartButton } from './components/FloatingCartButton';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { DnaGallery } from './components/DnaGallery';
import { IntakeCTA } from './components/IntakeCTA';
import { ChatAssistant } from './components/ChatAssistant';
import { Pricing } from './components/Pricing';
import { PricingModal } from './components/PricingModal';
import { Process } from './components/Process';
import { intakeFormUrl } from './data/site';

const observedSections = ['home', 'gallery', 'pricing', 'work', 'process', 'contact'] as const;
const themeStorageKey = 'nova-studio-theme';
type Theme = 'dark' | 'light';

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<(typeof observedSections)[number]>('home');
  const [theme, setTheme] = useState<Theme>('light');

  const sectionIds = useMemo(() => observedSections, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target instanceof HTMLElement) {
          setActiveSection(visible.target.id as (typeof observedSections)[number]);
        }
      },
      {
        rootMargin: '-35% 0px -45% 0px',
        threshold: [0.15, 0.3, 0.5, 0.7],
      },
    );

    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [sectionIds]);

  useEffect(() => {
    const revealNodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));

    if (revealNodes.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.2,
      },
    );

    revealNodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateScrollState = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 32);
      document.documentElement.style.setProperty('--header-float-offset', `${Math.min(64, scrollY * 0.12)}px`);
    };

    updateScrollState();
    window.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      window.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
      document.documentElement.style.removeProperty('--header-float-offset');
    };
  }, []);

  useEffect(() => {
    const locked = pricingOpen || mobileOpen;
    const root = document.documentElement;

    root.classList.toggle('scroll-locked', Boolean(locked));

    return () => {
      root.classList.remove('scroll-locked');
    };
  }, [mobileOpen, pricingOpen]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    window.localStorage.setItem(themeStorageKey, theme);

    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeColor) {
      themeColor.content = theme === 'light' ? '#f4f0ff' : '#050509';
    }
  }, [theme]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPricingOpen(false);
        setMobileOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="app-shell">
      <div className="ambient ambient--one" aria-hidden="true" />
      <div className="ambient ambient--two" aria-hidden="true" />
      <Header
        activeSection={activeSection}
        scrolled={isScrolled}
        theme={theme}
        mobileOpen={mobileOpen}
        onToggleMobile={() => setMobileOpen((value) => !value)}
        onCloseMobile={() => setMobileOpen(false)}
        onToggleTheme={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))}
        onStartClick={() => window.open(intakeFormUrl, '_blank', 'noreferrer')}
      />
      <main>
        <Hero intakeFormUrl={intakeFormUrl} />
        <DnaGallery />
        <Pricing />
        <FeaturedWork />
        <Process />
        <IntakeCTA />
      </main>
      <Footer />
      <FloatingCartButton />
      <ChatAssistant />
      <PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} />
    </div>
  );
}
