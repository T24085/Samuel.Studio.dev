import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import { ArrowUpRight, Menu, Moon, Sun, X } from 'lucide-react';
import { navItems } from '../data/site';

type HeaderProps = {
  activeSection: string;
  theme: 'dark' | 'light';
  mobileOpen: boolean;
  onToggleMobile: () => void;
  onCloseMobile: () => void;
  onToggleTheme: () => void;
  onStartClick: () => void;
};

export function Header({ activeSection, theme, mobileOpen, onToggleMobile, onCloseMobile, onToggleTheme, onStartClick }: HeaderProps) {
  const navRef = useRef<HTMLElement | null>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [pinnedSection, setPinnedSection] = useState<string | null>(null);
  const visualSection = hoveredSection ?? pinnedSection ?? activeSection;

  const updateGlow = (event: PointerEvent<HTMLElement>) => {
    const nav = navRef.current;

    if (!nav) {
      return;
    }

    const rect = nav.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    nav.style.setProperty('--nav-glow-x', `${Math.max(0, Math.min(100, x))}%`);
    nav.style.setProperty('--nav-glow-y', `${Math.max(0, Math.min(100, y))}%`);
    nav.style.setProperty('--nav-glow-opacity', '1');
  };

  const hideGlow = () => {
    const nav = navRef.current;

    if (!nav) {
      return;
    }

    nav.style.setProperty('--nav-glow-opacity', '0');
  };

  const updateIndicator = (section: string) => {
    const nav = navRef.current;
    const link = linkRefs.current[section];

    if (!nav || !link) {
      return;
    }

    const navRect = nav.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    const inset = 2;

    nav.style.setProperty('--nav-indicator-x', `${linkRect.left - navRect.left - inset}px`);
    nav.style.setProperty('--nav-indicator-y', `${linkRect.top - navRect.top - inset}px`);
    nav.style.setProperty('--nav-indicator-width', `${linkRect.width + inset * 2}px`);
    nav.style.setProperty('--nav-indicator-height', `${linkRect.height + inset * 2}px`);
    nav.style.setProperty('--nav-indicator-opacity', '1');
  };

  useLayoutEffect(() => {
    updateIndicator(visualSection);
  }, [visualSection]);

  useEffect(() => {
    if (pinnedSection && pinnedSection === activeSection) {
      setPinnedSection(null);
    }
  }, [activeSection, pinnedSection]);

  return (
    <header className="header">
      <div className="container header__inner">
        <div className="header__bar">
          <a className="brand" href="#home" onClick={onCloseMobile}>
            <span className="brand__name">SAMUEL</span>
            <span className="brand__studio">STUDIO</span>
          </a>

          <nav
            ref={navRef}
            className="nav"
            onPointerEnter={updateGlow}
            onPointerMove={updateGlow}
            onPointerLeave={() => {
              hideGlow();
              setHoveredSection(null);
            }}
          >
            <span className="nav__glow" aria-hidden="true" />
            <span className="nav__indicator" aria-hidden="true" />
            {navItems.map((item) => (
              <a
                key={item.href}
                ref={(node) => {
                  linkRefs.current[item.href.slice(1)] = node;
                }}
                className={visualSection === item.href.slice(1) ? 'nav__link nav__link--active' : 'nav__link'}
                href={item.href}
                onPointerEnter={() => {
                  setHoveredSection(item.href.slice(1));
                }}
                onFocus={() => {
                  setHoveredSection(item.href.slice(1));
                }}
                onPointerDown={() => {
                  setPinnedSection(item.href.slice(1));
                }}
                onClick={() => {
                  setPinnedSection(item.href.slice(1));
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="header__actions">
            <button className="button button--primary button--small" type="button" onClick={onStartClick}>
              Start Your Website
              <ArrowUpRight size={16} />
            </button>

            <button
              className="button button--ghost button--small theme-toggle"
              type="button"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              aria-pressed={theme === 'light'}
              onClick={onToggleTheme}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>

            <button
              className="menu-button"
              type="button"
              aria-expanded={mobileOpen}
              aria-label="Toggle navigation menu"
              onClick={onToggleMobile}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen ? (
        <div className="mobile-drawer">
          <div className="container mobile-drawer__inner">
            {navItems.map((item) => (
              <a key={item.href} className="mobile-drawer__link" href={item.href} onClick={onCloseMobile}>
                {item.label}
              </a>
            ))}
            <button className="button button--primary" type="button" onClick={onStartClick}>
              Start Your Website
              <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
