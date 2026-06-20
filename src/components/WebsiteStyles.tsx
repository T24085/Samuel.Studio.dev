import { useState, type CSSProperties } from 'react';
import { styleItems, type StyleItem } from '../data/styles';

type WebsiteStylesProps = {
  onOpenStyle: (item: StyleItem) => void;
};

export function WebsiteStyles({ onOpenStyle }: WebsiteStylesProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});

  const deckSize = styleItems.length;
  const selectedItem = styleItems[selectedIndex];

  const toggleCard = (index: number) => {
    setSelectedIndex(index);
    setFlippedCards((current) => ({
      ...current,
      [index]: !current[index],
    }));
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
          <div className="styles-deck__table">
            {styleItems.map((item, index) => {
              const flipped = Boolean(flippedCards[index]);
              const CardIcon = item.icon;
              const step = deckSize > 1 ? 72 / (deckSize - 1) : 0;
              const left = `${14 + index * step}%`;
              const offset = index - (deckSize - 1) / 2;
              const angle = `${offset * 8.5}deg`;
              const top = `${1.25 + Math.abs(offset) * 0.28}rem`;
              const lift = flipped ? '-1.35rem' : index === selectedIndex ? '-0.45rem' : '0rem';
              const scale = flipped ? '1.06' : index === selectedIndex ? '1.045' : '0.995';
              const depth = `${300 - index * 12}`;

              return (
                <button
                  className={flipped ? 'style-card style-card--deck style-card--flipped style-card--open' : 'style-card style-card--deck'}
                  type="button"
                  key={item.title}
                  aria-pressed={flipped}
                  aria-label={flipped ? `Close ${item.title}` : `Flip ${item.title} to reveal the text`}
                  onClick={() => toggleCard(index)}
                  style={
                    {
                      ['--card-left' as never]: left,
                      ['--card-angle' as never]: angle,
                      ['--card-top' as never]: top,
                      ['--card-lift' as never]: lift,
                      ['--card-scale' as never]: scale,
                      ['--card-depth' as never]: depth,
                    } as CSSProperties
                  }
                >
                  <span className="style-card__surface">
                    <span className="style-card__face style-card__face--front">
                      <span className={`style-card__preview style-card__preview--${item.accent}`}>
                        <img className="style-card__image" src={item.image} alt="" loading="lazy" />
                        <div className="style-card__preview-overlay" aria-hidden="true" />
                        <span>{item.preview}</span>
                        <div className="style-card__preview-lines" aria-hidden="true" />
                        <span className="style-card__flipHint">{flipped ? 'Flip to hide' : 'Flip to reveal'}</span>
                      </span>
                      <div className="style-card__frontFooter">
                        <div className="style-card__frontMark">
                          <div className="style-card__icon">
                            <CardIcon size={18} />
                          </div>
                          <div>
                            <strong>{item.title}</strong>
                            <span>Tap to reveal the direction notes.</span>
                          </div>
                        </div>
                      </div>
                    </span>

                    <span className="style-card__face style-card__face--back">
                      <span className="style-card__backTop">
                        <span className="section-label">Visual direction</span>
                        <span className={`style-card__backChip style-card__backChip--${item.accent}`}>{item.preview}</span>
                      </span>
                      <div className="style-card__backBody">
                        <p className="style-card__backEyebrow">
                          Card {index + 1} of {deckSize}
                        </p>
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                      </div>
                      <div className="style-card__backFooter">
                        <p>Flip the card back over when you’re ready to compare it with the rest of the table.</p>
                      </div>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="styles-deck__rail">
            <div className="styles-deck__counter">
              <span>Selected card</span>
              <strong>{selectedItem.title}</strong>
            </div>
            <p>{selectedItem.description}</p>
            <div className="styles-deck__actions">
              <button className="button button--ghost button--small" type="button" onClick={() => onOpenStyle(selectedItem)}>
                Open selected mockup
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
