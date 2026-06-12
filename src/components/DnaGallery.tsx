import { useEffect, useRef, useState, type WheelEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { dnaGalleryItems } from '../data/dnaGallery';

function DnaPreviewModal({
  item,
  index,
  total,
  onClose,
  onNext,
  onPrev,
  reducedMotion,
}: {
  item: (typeof dnaGalleryItems)[number] | null;
  index: number;
  total: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
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
                  <span>Side-scroll study</span>
                  <span>High-res preview</span>
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

export function DnaGallery() {
  const railRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const activeItem = activeIndex !== null ? dnaGalleryItems[activeIndex] : null;

  const handleRailWheel = (event: WheelEvent<HTMLDivElement>) => {
    const rail = railRef.current;

    if (!rail) {
      return;
    }

    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
      return;
    }

    event.preventDefault();
    rail.scrollLeft += event.deltaY;
  };

  const nextCard = () => {
    if (!dnaGalleryItems.length) {
      return;
    }

    setActiveIndex((current) => ((current ?? 0) + 1) % dnaGalleryItems.length);
  };

  const prevCard = () => {
    if (!dnaGalleryItems.length) {
      return;
    }

    setActiveIndex((current) => ((current ?? 0) - 1 + dnaGalleryItems.length) % dnaGalleryItems.length);
  };

  return (
    <section className="section dna-scroll-gallery" id="gallery">
      <div className="container">
        <div className="dna-scroll-gallery__intro" data-reveal>
          <p className="section-label">Mockup gallery</p>
          <h2>Scroll through the mockups.</h2>
          <p>
            A horizontal rail of 15 mockups. Scroll sideways with your mouse wheel or trackpad, then tap any card to open it larger.
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
            Drag, wheel, or swipe
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

        <p className="dna-scroll-gallery__hint">Use the horizontal bar below if your trackpad gesture is not moving the rail.</p>

        <div className="dna-scroll-gallery__rail" ref={railRef} onWheel={handleRailWheel}>
          {dnaGalleryItems.map((item, index) => (
            <motion.button
              key={item.id}
              type="button"
              className="dna-scroll-gallery__card"
              onClick={() => setActiveIndex(index)}
              initial={reducedMotion ? undefined : { opacity: 0, y: 18 }}
              whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.42, ease: 'easeOut', delay: index * 0.03 }}
            >
              <div className="dna-scroll-gallery__imageShell">
                <img className="dna-scroll-gallery__image" src={item.image} alt={item.description} loading="lazy" decoding="async" />
              </div>

              <div className="dna-scroll-gallery__copy">
                <p>{item.number} / Nova Studio</p>
                <h3>{item.title}</h3>
                <span>{item.description}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <DnaPreviewModal
        item={activeItem}
        index={activeIndex ?? 0}
        total={dnaGalleryItems.length}
        onClose={() => setActiveIndex(null)}
        onNext={nextCard}
        onPrev={prevCard}
        reducedMotion={Boolean(reducedMotion)}
      />
    </section>
  );
}
