import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useReducedMotion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { dnaGalleryItems } from '../data/dnaGallery';

export function DnaGallery() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isGalleryActive, setIsGalleryActive] = useState(false);
  const railX = useMotionValue(0);
  const isGalleryActiveRef = useRef(false);
  const loopWidthRef = useRef(0);
  const offsetRef = useRef(0);
  const animationFrameRef = useRef(0);
  const snapFrameRef = useRef(0);
  const lastTickRef = useRef(0);
  const lastScrollYRef = useRef(0);
  const loopItems = [...dnaGalleryItems, ...dnaGalleryItems];

  useEffect(() => {
    const updateTravel = () => {
      const rail = railRef.current;
      const viewport = viewportRef.current;

      if (!rail || !viewport) {
        return;
      }

      const nextLoopWidth = Math.max(0, Math.round(rail.scrollWidth / 2));
      loopWidthRef.current = nextLoopWidth;

      if (nextLoopWidth > 0) {
        offsetRef.current = ((offsetRef.current % nextLoopWidth) + nextLoopWidth) % nextLoopWidth;
        railX.set(-offsetRef.current);
      }
    };

    updateTravel();

    const rail = railRef.current;
    const viewport = viewportRef.current;
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      window.requestAnimationFrame(updateTravel);
    });

    if (observer) {
      if (rail) {
        observer.observe(rail);
      }

      if (viewport) {
        observer.observe(viewport);
      }
    }

    window.addEventListener('resize', updateTravel);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateTravel);
    };
  }, [railX]);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) {
      return;
    }

    const updateLockState = () => {
      const sectionRect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const direction = window.scrollY >= lastScrollYRef.current ? 1 : -1;
      const active = sectionRect.bottom > 0 && sectionRect.top < viewportHeight;
      const snapBand = Math.max(120, viewportHeight * 0.22);
      const shouldSnap = direction > 0 && sectionRect.top >= 0 && sectionRect.top <= snapBand && sectionRect.bottom > viewportHeight * 0.35;

      lastScrollYRef.current = window.scrollY;
      isGalleryActiveRef.current = active;
      setIsGalleryActive(active);

      if (shouldSnap) {
        window.cancelAnimationFrame(snapFrameRef.current);
        snapFrameRef.current = window.requestAnimationFrame(() => {
          const currentTop = section.getBoundingClientRect().top;

          if (currentTop > 0) {
            window.scrollBy({ top: currentTop, left: 0, behavior: 'auto' });
          }
        });
      }
    };

    const onScroll = () => {
      window.cancelAnimationFrame(snapFrameRef.current);
      snapFrameRef.current = window.requestAnimationFrame(updateLockState);
    };

    lastScrollYRef.current = window.scrollY;
    updateLockState();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      window.cancelAnimationFrame(snapFrameRef.current);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    const speed = 34;
    const tick = (time: number) => {
      const loopWidth = loopWidthRef.current;

      if (!lastTickRef.current) {
        lastTickRef.current = time;
      }

      const delta = Math.min(32, time - lastTickRef.current);
      lastTickRef.current = time;

      if (isGalleryActiveRef.current && loopWidth > 0) {
        offsetRef.current = (offsetRef.current + (speed * delta) / 1000) % loopWidth;
        railX.set(-offsetRef.current);
      }

      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrameRef.current);
    };
  }, [railX, reducedMotion]);

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveIndex(null);
      }

      if (!dnaGalleryItems.length) {
        return;
      }

      if (event.key === 'ArrowRight') {
        setActiveIndex((current) => ((current ?? 0) + 1) % dnaGalleryItems.length);
      }

      if (event.key === 'ArrowLeft') {
        setActiveIndex((current) => ((current ?? 0) - 1 + dnaGalleryItems.length) % dnaGalleryItems.length);
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [activeIndex]);

  return (
    <section className="section dna-scroll-gallery dna-scroll-gallery--travel" id="gallery" ref={sectionRef}>
      <div className="dna-scroll-gallery__track" ref={trackRef}>
        <div className="dna-scroll-gallery__sticky">
          <div className="dna-scroll-gallery__shell">
            <div className="dna-scroll-gallery__toolbar" aria-hidden="true">
              <span>Scroll sideways</span>
              <span className="dna-scroll-gallery__toolbarHint">
                <motion.span
                  className="dna-scroll-gallery__toolbarCue"
                  animate={
                    reducedMotion
                      ? undefined
                      : {
                          x: [0, 6, 0],
                          opacity: [0.55, 1, 0.55],
                        }
                  }
                  transition={reducedMotion ? undefined : { duration: 1.6, ease: 'easeInOut', repeat: Infinity }}
                >
                  <ChevronRight size={14} />
                </motion.span>
                Tap a panel to focus
                <motion.span
                  className="dna-scroll-gallery__toolbarCue"
                  animate={
                    reducedMotion
                      ? undefined
                      : {
                          x: [0, -6, 0],
                          opacity: [0.55, 1, 0.55],
                        }
                  }
                  transition={reducedMotion ? undefined : { duration: 1.6, ease: 'easeInOut', repeat: Infinity, delay: 0.2 }}
                >
                  <ChevronRight size={14} />
                </motion.span>
              </span>
              <span>{String(dnaGalleryItems.length).padStart(2, '0')} mockups</span>
            </div>

            <div className="dna-scroll-gallery__viewport" ref={viewportRef}>
              <motion.div className="dna-scroll-gallery__rail" ref={railRef} style={reducedMotion ? undefined : { x: railX }}>
                {loopItems.map((item, index) => (
                  <motion.button
                    key={`${item.id}-${index}`}
                    type="button"
                    className={`dna-scroll-gallery__card${activeIndex === index ? ' is-active' : ''}`}
                    onClick={() => setActiveIndex((current) => (current === index ? null : index))}
                    initial={reducedMotion ? undefined : { opacity: 0, y: 18 }}
                    whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ duration: 0.42, ease: 'easeOut', delay: index * 0.03 }}
                    aria-pressed={activeIndex === index}
                    ref={(node) => {
                      slideRefs.current[index] = node;
                    }}
                  >
                    <div className="dna-scroll-gallery__imageShell dna-scroll-gallery__imageShell--travel">
                      <img className="dna-scroll-gallery__image" src={item.image} alt={item.description} loading="lazy" decoding="async" />
                      <div className="dna-scroll-gallery__overlay" aria-hidden="true" />
                    </div>

                    <div className="dna-scroll-gallery__copy dna-scroll-gallery__copy--travel">
                      <p>{item.number} / Nova Studio</p>
                      <h3>{item.title}</h3>
                      <span>{item.description}</span>
                      <div className="dna-scroll-gallery__action">
                        <span>{activeIndex === index ? 'Unfocus panel' : 'Focus panel'}</span>
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
