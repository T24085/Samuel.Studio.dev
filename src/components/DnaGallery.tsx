import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { dnaGalleryItems, type DnaGalleryItem } from '../data/dnaGallery';

const galleryTestimonials = [
  {
    label: 'Clarity',
    quote: 'The process felt polished, clear, and easy to trust from the first conversation.',
    title: 'Recent client',
    detail: 'Website launch project',
  },
  {
    label: 'Polish',
    quote: 'Every detail felt considered. The site looks premium and the next steps were always obvious.',
    title: 'Recent client',
    detail: 'Growth package build',
  },
  {
    label: 'Momentum',
    quote: 'We moved from ideas to a clean, confident site faster than expected.',
    title: 'Recent client',
    detail: 'Mockup to launch',
  },
] as const;

function useMarqueeMotion({
  active,
  direction,
  initialOffset = 0,
  reducedMotion,
  speed,
}: {
  active: boolean;
  direction: 1 | -1;
  initialOffset?: number;
  reducedMotion: boolean;
  speed: number;
}) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const railX = useMotionValue(0);
  const loopWidthRef = useRef(0);
  const offsetRef = useRef(initialOffset);
  const animationFrameRef = useRef(0);
  const lastTickRef = useRef(0);

  useEffect(() => {
    const updateWidth = () => {
      const rail = railRef.current;

      if (!rail) {
        return;
      }

      const nextLoopWidth = Math.max(0, Math.round(rail.scrollWidth / 2));
      loopWidthRef.current = nextLoopWidth;

      if (nextLoopWidth > 0) {
        offsetRef.current = ((offsetRef.current % nextLoopWidth) + nextLoopWidth) % nextLoopWidth;
        railX.set(-offsetRef.current);
      }
    };

    updateWidth();

    const rail = railRef.current;
    const viewport = viewportRef.current;
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      window.requestAnimationFrame(updateWidth);
    });

    if (observer) {
      if (rail) {
        observer.observe(rail);
      }

      if (viewport) {
        observer.observe(viewport);
      }
    }

    window.addEventListener('resize', updateWidth);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, [railX]);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    const tick = (time: number) => {
      const loopWidth = loopWidthRef.current;

      if (!lastTickRef.current) {
        lastTickRef.current = time;
      }

      const delta = Math.min(32, time - lastTickRef.current);
      lastTickRef.current = time;

      if (active && loopWidth > 0) {
        const nextOffset = offsetRef.current + direction * (speed * delta) / 1000;
        offsetRef.current = ((nextOffset % loopWidth) + loopWidth) % loopWidth;
        railX.set(-offsetRef.current);
      }

      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrameRef.current);
    };
  }, [active, direction, reducedMotion, railX, speed]);

  useEffect(() => {
    if (!reducedMotion && initialOffset > 0) {
      offsetRef.current = initialOffset;
      railX.set(-initialOffset);
    }
  }, [initialOffset, railX, reducedMotion]);

  return { railRef, railX, viewportRef };
}

function GalleryPreviewModal({
  index,
  item,
  onClose,
  onNext,
  onPrev,
  total,
  reducedMotion,
}: {
  index: number;
  item: DnaGalleryItem | null;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  total: number;
  reducedMotion: boolean;
}) {
  useEffect(() => {
    if (!item) {
      return undefined;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }

      if (event.key === 'ArrowRight') {
        onNext();
      }

      if (event.key === 'ArrowLeft') {
        onPrev();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [item, onClose, onNext, onPrev]);

  return (
    <AnimatePresence>
      {item ? (
        <motion.div
          className="dna-modal"
          role="presentation"
          onClick={onClose}
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <motion.div
            className="dna-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label={item.title}
            initial={reducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96, y: 18 }}
            transition={{ type: 'spring', stiffness: 140, damping: 20 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dna-modal__veil" aria-hidden="true" />

            <button type="button" className="dna-modal__close" onClick={onClose} aria-label="Close preview">
              <X size={18} />
            </button>

            {total > 1 ? (
              <>
                <button type="button" className="dna-modal__nav dna-modal__nav--prev" onClick={onPrev} aria-label="Previous preview">
                  <ChevronLeft size={18} />
                </button>
                <button type="button" className="dna-modal__nav dna-modal__nav--next" onClick={onNext} aria-label="Next preview">
                  <ChevronRight size={18} />
                </button>
              </>
            ) : null}

            <div className="dna-modal__grid">
              <div className="dna-modal__imageShell">
                <img className="dna-modal__image" src={item.image} alt={item.description} loading="eager" decoding="async" />
              </div>

              <div className="dna-modal__copy">
                <div className="dna-modal__meta">
                  <span>
                    {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
                  </span>
                  <span>Nova Studio</span>
                </div>

                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>

                <div className="dna-modal__tags">
                  <span>Homepage mockup</span>
                  <span>Click to browse</span>
                </div>

                <p className="dna-modal__hint">Use escape or the arrow keys to browse the set.</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function MarqueeRow({
  active,
  direction,
  initialOffset,
  items,
  activeItemId,
  onSelect,
  reducedMotion,
  rowLabel,
  speed,
}: {
  active: boolean;
  direction: 1 | -1;
  initialOffset?: number;
  items: DnaGalleryItem[];
  activeItemId: string | null;
  onSelect: (itemId: string) => void;
  reducedMotion: boolean;
  rowLabel: string;
  speed: number;
}) {
  const loopItems = useMemo(() => [...items, ...items], [items]);
  const { railRef, railX, viewportRef } = useMarqueeMotion({
    active,
    direction,
    initialOffset,
    reducedMotion,
    speed,
  });

  return (
    <div className="dna-scroll-gallery__row">
      <div className="dna-scroll-gallery__rowHeader">
        <span>{rowLabel}</span>
        <span>{String(items.length).padStart(2, '0')} images</span>
      </div>

      <div className="dna-scroll-gallery__rowViewport" ref={viewportRef}>
        <motion.div className="dna-scroll-gallery__rowRail" ref={railRef} style={reducedMotion ? undefined : { x: railX }}>
          {loopItems.map((item, index) => {
            const isSelected = activeItemId === item.id;

            return (
              <motion.button
                key={`${item.id}-${index}`}
                type="button"
                className={`dna-scroll-gallery__card${isSelected ? ' is-active' : ''}`}
                onClick={() => onSelect(item.id)}
                initial={reducedMotion ? undefined : { opacity: 0, y: 16 }}
                whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.38, ease: 'easeOut', delay: index * 0.015 }}
              >
                <div className="dna-scroll-gallery__imageShell dna-scroll-gallery__imageShell--compact">
                  <img className="dna-scroll-gallery__image" src={item.image} alt={item.description} loading="lazy" decoding="async" />
                  <div className="dna-scroll-gallery__overlay" aria-hidden="true" />
                </div>

                <div className="dna-scroll-gallery__copy dna-scroll-gallery__copy--compact">
                  <p>{item.number}</p>
                  <h3>{item.title}</h3>
                  <span>{item.description}</span>
                  <div className="dna-scroll-gallery__action">
                    <span>Open preview</span>
                    <ChevronRight size={16} />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}

export function DnaGallery() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const reducedMotion = useReducedMotion();
  const [isActive, setIsActive] = useState(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const topRowItems = useMemo(() => dnaGalleryItems.slice(0, 8), []);
  const bottomRowItems = useMemo(() => dnaGalleryItems.slice(8), []);

  const activeIndex = activeItemId === null ? -1 : dnaGalleryItems.findIndex((item) => item.id === activeItemId);
  const activeItem = activeIndex >= 0 ? dnaGalleryItems[activeIndex] : null;

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsActive(entry.isIntersecting);
      },
      {
        threshold: 0.14,
      },
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  const openItem = (itemId: string) => {
    setActiveItemId(itemId);
  };

  const closeItem = () => {
    setActiveItemId(null);
  };

  const nextItem = () => {
    if (!dnaGalleryItems.length) {
      return;
    }

    setActiveItemId((current) => {
      const currentIndex = current === null ? 0 : dnaGalleryItems.findIndex((item) => item.id === current);
      return dnaGalleryItems[(currentIndex + 1) % dnaGalleryItems.length].id;
    });
  };

  const prevItem = () => {
    if (!dnaGalleryItems.length) {
      return;
    }

    setActiveItemId((current) => {
      const currentIndex = current === null ? 0 : dnaGalleryItems.findIndex((item) => item.id === current);
      return dnaGalleryItems[(currentIndex - 1 + dnaGalleryItems.length) % dnaGalleryItems.length].id;
    });
  };

  return (
    <section className="section dna-scroll-gallery dna-scroll-gallery--travel" id="gallery" ref={sectionRef}>
      <div className="dna-scroll-gallery__shell">
        <div className="dna-scroll-gallery__intro" data-reveal>
          <span className="section-label">Website Mockups</span>
          <h2>Mockups that set the tone.</h2>
          <p>Preview the visual direction, spacing, and atmosphere before the build starts.</p>
        </div>

        <MarqueeRow
          active={isActive}
          direction={-1}
          activeItemId={activeItemId}
          items={topRowItems}
          onSelect={openItem}
          reducedMotion={Boolean(reducedMotion)}
          rowLabel="Top row"
          speed={58}
        />

        <MarqueeRow
          active={isActive}
          direction={1}
          activeItemId={activeItemId}
          initialOffset={260}
          items={bottomRowItems}
          onSelect={openItem}
          reducedMotion={Boolean(reducedMotion)}
          rowLabel="Bottom row"
          speed={46}
        />
      </div>

      <section className="dna-scroll-gallery__testimonials" aria-label="Client feedback">
        <div className="dna-scroll-gallery__testimonialsHeader">
          <span>Client Feedback</span>
          <h3>Clear process. Better output.</h3>
          <p>Three short notes from recent launches.</p>
        </div>

        <div className="dna-scroll-gallery__testimonialsGrid">
          {galleryTestimonials.map((testimonial) => (
            <blockquote key={`${testimonial.title}-${testimonial.detail}`} className="dna-scroll-gallery__testimonial">
              <span className="dna-scroll-gallery__testimonialLabel">{testimonial.label}</span>
              <p className="dna-scroll-gallery__testimonialQuote">{testimonial.quote}</p>
              <div className="dna-scroll-gallery__testimonialMeta">
                <strong>{testimonial.title}</strong>
                <span>{testimonial.detail}</span>
              </div>
            </blockquote>
          ))}
        </div>
      </section>

      <GalleryPreviewModal
        index={activeIndex >= 0 ? activeIndex : 0}
        item={activeItem}
        onClose={closeItem}
        onNext={nextItem}
        onPrev={prevItem}
        reducedMotion={Boolean(reducedMotion)}
        total={dnaGalleryItems.length}
      />
    </section>
  );
}
