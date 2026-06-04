import { ArrowUpRight, Check, X } from 'lucide-react';
import { addOns, packages } from '../data/pricing';
import { intakeFormUrl } from '../data/site';

type PricingModalProps = {
  open: boolean;
  onClose: () => void;
};

export function PricingModal({ open, onClose }: PricingModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="pricing-modal-title" onClick={(event) => event.stopPropagation()}>
        <button className="modal__close" type="button" aria-label="Close pricing modal" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="modal__header">
          <p className="section-label">Website packages</p>
          <h2 id="pricing-modal-title">Custom websites with a sharper way to turn attention into action.</h2>
          <p className="modal__lede">
            Built for creators, models, brands, and businesses that want presence, clarity, and a polished finish.
          </p>
        </div>

        <div className="modal__packages">
          {packages.map((pkg) => (
            <article className={pkg.featured ? 'modal-card modal-card--featured' : 'modal-card'} key={pkg.title}>
              {pkg.featured ? <span className="modal-card__badge">Most Popular</span> : null}
              <div className="modal-card__top">
                <div>
                  <h3>{pkg.title}</h3>
                  <p>{pkg.description}</p>
                </div>
                <strong>{pkg.price}</strong>
              </div>
              <ul className="check-list">
                {pkg.includes.map((item) => (
                  <li key={item}>
                    <Check size={15} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="modal__addons">
          <div className="modal__addons-head">
            <h3>Add-ons</h3>
            <p>Enhancements that can be added to any project.</p>
          </div>
          <div className="modal__addons-grid">
            {addOns.map((addon) => (
              <div className="addon-row" key={addon.name}>
                <span>{addon.name}</span>
                <strong>{addon.price}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="modal__footer">
          <p>Every project is built custom. No templates, no shortcuts, just a focused site designed to look sharp and perform fast.</p>
          <a className="button button--primary" href={intakeFormUrl} target="_blank" rel="noreferrer">
            Start Your Website
            <ArrowUpRight size={16} />
          </a>
        </div>
      </div>
    </div>
  );
}
