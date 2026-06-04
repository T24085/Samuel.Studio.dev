import { styleItems, type StyleItem } from '../data/styles';

type WebsiteStylesProps = {
  onOpenStyle: (item: StyleItem) => void;
};

export function WebsiteStyles({ onOpenStyle }: WebsiteStylesProps) {
  return (
    <section className="section" id="styles">
      <div className="container">
        <div className="section-heading" data-reveal>
          <p className="section-label">Website styles</p>
          <h2>Pick a visual direction.</h2>
          <p>Every brand needs one clear atmosphere. Choose the lane that fits your audience and the way you want the site to feel.</p>
        </div>

        <div className="styles-grid">
          {styleItems.map((item) => {
            const Icon = item.icon;

            return (
              <article className={item.featured ? 'style-card style-card--featured' : 'style-card'} key={item.title} data-reveal>
                <button
                  className="style-card__open"
                  type="button"
                  aria-label={`Open full-size mockup for ${item.title}`}
                  onClick={() => onOpenStyle(item)}
                />
                <div className={`style-card__preview style-card__preview--${item.accent}`}>
                  <img className="style-card__image" src={item.image} alt={`${item.title} mockup`} loading="lazy" />
                  <div className="style-card__preview-overlay" aria-hidden="true" />
                  <span>{item.preview}</span>
                  <div className="style-card__preview-lines" aria-hidden="true" />
                </div>
                <div className="style-card__body">
                  <div className="style-card__icon">
                    <Icon size={18} />
                  </div>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
