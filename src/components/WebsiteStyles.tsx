import { useState } from 'react';
import { styleItems, type StyleItem } from '../data/styles';

type WebsiteStylesProps = {
  onOpenStyle: (item: StyleItem) => void;
};

export function WebsiteStyles({ onOpenStyle }: WebsiteStylesProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const deckSize = styleItems.length;
  const activeItem = styleItems[activeIndex];
  const ActiveIcon = activeItem.icon;
  const nextItem = styleItems[(activeIndex + 1) % deckSize];
  const trailingItem = styleItems[(activeIndex + 2) % deckSize];

  const advanceDeck = () => {
    setActiveIndex((value) => (value + 1) % deckSize);
    setIsFlipped(false);
  };

  const handleDeckClick = () => {
    if (!isFlipped) {
      setIsFlipped(true);
      return;
    }

    advanceDeck();
  };

  return (
    <section className="section" id="styles">
      <div className="container">
        <div className="section-heading" data-reveal>
          <p className="section-label">Website styles</p>
          <h2>Pick a visual direction.</h2>
          <p>Every brand needs one clear atmosphere. Choose the lane that fits your audience and the way you want the site to feel.</p>
        </div>

        <div className="styles-deck" data-reveal>
          <div className="styles-deck__stage">
            <div className="styles-deck__stack" aria-hidden="true">
              {[trailingItem, nextItem].map((item, index) => (
                <article
                  className={`style-card style-card--deck style-card--stacked style-card--stacked-${index + 1} style-card--stacked-${item.accent}`}
                  key={`${item.title}-${index}`}
                >
                  <div className={`style-card__preview style-card__preview--${item.accent}`}>
                    <img className="style-card__image" src={item.image} alt="" loading="lazy" />
                    <div className="style-card__preview-overlay" aria-hidden="true" />
                    <span>{item.preview}</span>
                    <div className="style-card__preview-lines" aria-hidden="true" />
                  </div>
                </article>
              ))}
            </div>

            <button
              className={isFlipped ? 'style-card style-card--deck style-card--flipped' : 'style-card style-card--deck'}
              type="button"
              aria-pressed={isFlipped}
              aria-label={isFlipped ? `Advance from ${activeItem.title} to the next visual direction` : `Flip ${activeItem.title} to reveal the text`}
              onClick={handleDeckClick}
            >
              <span className="style-card__surface">
                <span className="style-card__face style-card__face--front">
                  <span className={`style-card__preview style-card__preview--${activeItem.accent}`}>
                    <img className="style-card__image" src={activeItem.image} alt="" loading="lazy" />
                    <div className="style-card__preview-overlay" aria-hidden="true" />
                    <span>{activeItem.preview}</span>
                    <div className="style-card__preview-lines" aria-hidden="true" />
                    <span className="style-card__flipHint">{isFlipped ? 'Flip again for the next card' : 'Click to flip the card'}</span>
                  </span>
                  <div className="style-card__frontFooter">
                    <div className="style-card__frontMark">
                      <div className="style-card__icon">
                        <ActiveIcon size={18} />
                      </div>
                      <div>
                        <strong>{activeItem.title}</strong>
                        <span>Tap to reveal the direction notes.</span>
                      </div>
                    </div>
                  </div>
                </span>

                <span className="style-card__face style-card__face--back">
                  <span className="style-card__backTop">
                    <span className="section-label">Visual direction</span>
                    <span className={`style-card__backChip style-card__backChip--${activeItem.accent}`}>{activeItem.preview}</span>
                  </span>
                  <div className="style-card__backBody">
                    <p className="style-card__backEyebrow">Card {activeIndex + 1} of {deckSize}</p>
                    <h3>{activeItem.title}</h3>
                    <p>{activeItem.description}</p>
                  </div>
                  <div className="style-card__backFooter">
                    <p>Click the card again to move to the next direction. Open the full mockup if you want to inspect the layout at scale.</p>
                  </div>
                </span>
              </span>
            </button>
          </div>

          <div className="styles-deck__meta">
            <div className="styles-deck__counter">
              <span>Card {activeIndex + 1}</span>
              <strong>{activeItem.title}</strong>
            </div>
            <p>Flip the top card to reveal the text. The next two directions are stacked behind it like a physical deck.</p>
            <div className="styles-deck__actions">
              <button className="button button--secondary button--small" type="button" onClick={() => onOpenStyle(activeItem)}>
                Open mockup
              </button>
              <button className="button button--ghost button--small" type="button" onClick={advanceDeck}>
                Next card
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
