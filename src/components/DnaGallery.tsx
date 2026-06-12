import { useEffect, useRef, useState, type WheelEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { dnaGalleryItems } from '../data/dnaGallery';

export function DnaGallery() {
  const railRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const handleRailWheel = (event: WheelEvent<HTMLDivElement>) => {
    const rail = railRef.current;

    if (!rail) {
      return;
    }

    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
      return;
    }

    event.preventDefault();
    rail.scrollLeft += event.deltaY * 0.88;
  };

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

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }

    const slide = slideRefs.current[activeIndex];

    slide?.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [activeIndex, reducedMotion]);

  return (
    <section className="section dna-scroll-gallery dna-scroll-gallery--travel" id="gallery">
      <div className="container">
        <div className="dna-scroll-gallery__intro" data-reveal>
          <p className="section-label">Mockup gallery</p>
          <h2>Click a panel to expand it.</h2>
          <p>
            A flexbox gallery inspired by editorial travel layouts. Scroll sideways to move through the set, then click any panel to focus it.
          </p>
        </div>
      </div>

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
            Tap a panel to expand
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

        <p className="dna-scroll-gallery__hint">The selected panel expands in place. Use the horizontal bar below if you want to jump across the set.</p>

        <div className="dna-scroll-gallery__rail" ref={railRef} onWheel={handleRailWheel}>
          {dnaGalleryItems.map((item, index) => (
            <motion.button
              key={item.id}
              type="button"
              className={`dna-scroll-gallery__card${activeIndex === index ? ' is-active' : activeIndex !== null ? ' is-dimmed' : ''}`}
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
                  <span>{activeIndex === index ? 'Collapse panel' : 'Expand panel'}</span>
                  <ChevronRight size={16} />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}
