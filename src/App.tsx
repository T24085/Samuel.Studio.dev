import { useEffect, useMemo, useState } from 'react';
import { FeaturedWork } from './components/FeaturedWork';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { IntakeCTA } from './components/IntakeCTA';
import { FloatingCartButton } from './components/FloatingCartButton';
import { Pricing } from './components/Pricing';
import { PricingModal } from './components/PricingModal';
import { Process } from './components/Process';
import { StyleImageModal } from './components/StyleImageModal';
import { WebsiteStyles } from './components/WebsiteStyles';
import { type StyleItem } from './data/styles';
import { intakeFormUrl } from './data/site';

const observedSections = ['home', 'work', 'styles', 'pricing', 'process', 'contact'] as const;
const themeStorageKey = 'nova-studio-theme';
type Theme = 'dark' | 'light';

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [styleImageItem, setStyleImageItem] = useState<StyleItem | null>(null);
  const [activeSection, setActiveSection] = useState<(typeof observedSections)[number]>('home');
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') {
      return 'dark';
    }

    const savedTheme = window.localStorage.getItem(themeStorageKey);
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }

    return 'dark';
  });

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
    const locked = pricingOpen || mobileOpen || styleImageItem;
    const root = document.documentElement;

    root.classList.toggle('scroll-locked', Boolean(locked));

    return () => {
      root.classList.remove('scroll-locked');
    };
  }, [mobileOpen, pricingOpen, styleImageItem]);

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
        setStyleImageItem(null);
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
        theme={theme}
        mobileOpen={mobileOpen}
        onToggleMobile={() => setMobileOpen((value) => !value)}
        onCloseMobile={() => setMobileOpen(false)}
        onToggleTheme={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))}
        onStartClick={() => window.open(intakeFormUrl, '_blank', 'noreferrer')}
      />
      <main>
        <Hero onOpenPricingModal={() => setPricingOpen(true)} intakeFormUrl={intakeFormUrl} />
        <FeaturedWork />
        <WebsiteStyles onOpenStyle={setStyleImageItem} />
        <Pricing />
        <Process />
        <IntakeCTA />
      </main>
      <Footer />
      <FloatingCartButton />
      <PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} />
      <StyleImageModal item={styleImageItem} onClose={() => setStyleImageItem(null)} />
    </div>
  );
}
