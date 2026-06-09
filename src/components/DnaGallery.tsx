import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { dnaGalleryItems } from '../data/dnaGallery';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function useScrollProgress(sceneRef: RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const scene = sceneRef.current;

      if (!scene) {
        setProgress(0);
        return;
      }

      const viewport = window.innerHeight || 1;
      const rect = scene.getBoundingClientRect();
      const sceneTop = rect.top + window.scrollY;
      const travel = Math.max(scene.offsetHeight - viewport, 1);
      const raw = (window.scrollY - sceneTop) / travel;
      setProgress(clamp(raw, 0, 1));
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [sceneRef]);

  return progress;
}

function createHelixLayout(items: typeof dnaGalleryItems, progress: number) {
  const radius = 180;
  const spacing = 148;
  const step = 0.54;
  const travel = 1180;
  const totalVisibleShift = travel * progress;
  const centerLift = 200;

  return items.map((item, index) => {
    const t = items.length <= 1 ? 0 : index / (items.length - 1);
    const baseAngle = index * step + progress * Math.PI * 1.15;
    const strandAngle = index % 2 === 0 ? 0 : Math.PI;
    const angle = baseAngle + strandAngle;
    const vertical = index * spacing - totalVisibleShift + Math.cos(baseAngle) * 12;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * 132;
    const focus = 1 - clamp(Math.abs(vertical - centerLift) / 680, 0, 1);
    const scale = 0.96 + focus * 0.34;
    const opacity = 0.7 + focus * 0.3;
    const tilt = Math.sin(angle) * 7;
    const depthBias = Math.cos(angle) * 0.05;
    const shadowStrength = 0.16 + focus * 0.14;

    return {
      ...item,
      style: {
        opacity,
        zIndex: String(Math.round((1 - t) * 1000)),
        transform: `translate3d(-50%, -50%, 0) translate3d(${x.toFixed(2)}px, ${vertical.toFixed(2)}px, ${z.toFixed(2)}px) rotateY(${tilt.toFixed(2)}deg) scale(${scale.toFixed(3)})`,
        boxShadow: `0 22px 60px rgba(15, 12, 10, ${shadowStrength.toFixed(3)})`,
        filter: `brightness(${(0.94 + depthBias * 0.18).toFixed(3)}) saturate(${(0.98 + focus * 0.16).toFixed(3)})`,
      },
    };
  });
}

function DnaCard({
  card,
  onSelect,
}: {
  card: (typeof dnaGalleryItems)[number] & {
    style: CSSProperties;
  };
  onSelect: () => void;
}) {
  return (
    <motion.button
      type="button"
      className="dna-card"
      style={card.style}
      onClick={onSelect}
      aria-label={`Open ${card.title}`}
    >
      <img className="dna-card__image" src={card.image} alt={card.description} loading="lazy" decoding="async" />
      <div className="dna-card__fade" aria-hidden="true" />
      <div className="dna-card__number">{card.number}</div>
      <div className="dna-card__copy">
        <p>Samuel Studio / Preview</p>
        <h3>{card.title}</h3>
        <span>Tap to inspect</span>
      </div>
    </motion.button>
  );
}

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
                  <span>Samuel Studio</span>
                </div>

                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>

                <div className="dna-modal__tags">
                  <span>Scroll study</span>
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
  const sceneRef = useRef<HTMLElement | null>(null);
  const reducedMotion = useReducedMotion();
  const progress = useScrollProgress(sceneRef);
  const effectiveProgress = reducedMotion ? 0 : Math.pow(progress, 1.35);
  const cards = useMemo(() => createHelixLayout(dnaGalleryItems, effectiveProgress), [effectiveProgress]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const activeItem = activeIndex !== null ? dnaGalleryItems[activeIndex] : null;

  const openCard = (index: number) => {
    setActiveIndex(index);
  };

  const closeCard = () => {
    setActiveIndex(null);
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
    <section ref={sceneRef} className="section dna-gallery" id="gallery">
      <div className="container">
        <div className="dna-gallery__intro" data-reveal>
          <p className="section-label">DNA gallery</p>
          <h2>Scroll through the helix.</h2>
          <p>
            A continuous chain of 15 reference screenshots arranged as a double-helix.
            Scroll to move through the strand and tap any frame to preview it larger.
          </p>
        </div>
      </div>

      <div className="dna-gallery__track">
        <div className="dna-gallery__sticky">
          <motion.div
            className="dna-gallery__aura"
            aria-hidden="true"
            animate={
              reducedMotion
                ? undefined
                : {
                    opacity: [0.42, 0.64, 0.42],
                    scale: [1, 1.01, 1],
                  }
            }
            transition={reducedMotion ? undefined : { duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="dna-gallery__stage">
            <div className="dna-gallery__strands" aria-hidden="true">
              <span className="dna-gallery__strand dna-gallery__strand--left" />
              <span className="dna-gallery__strand dna-gallery__strand--right" />
              <span className="dna-gallery__cross dna-gallery__cross--top" />
              <span className="dna-gallery__cross dna-gallery__cross--bottom" />
              <span className="dna-gallery__glow" />
            </div>

            {cards.map((card, index) => (
              <DnaCard key={card.id} card={card} onSelect={() => openCard(index)} />
            ))}
          </div>
        </div>
      </div>

      <DnaPreviewModal
        item={activeItem}
        index={activeIndex ?? 0}
        total={dnaGalleryItems.length}
        onClose={closeCard}
        onNext={nextCard}
        onPrev={prevCard}
        reducedMotion={Boolean(reducedMotion)}
      />
    </section>
  );
}
