import type { CSSProperties } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import { addOns, packages } from '../data/pricing';
import { PackageAction } from './PackageAction';
import { intakeFormUrl } from '../data/site';

export function Pricing() {
  return (
    <section className="section" id="pricing">
      <div className="container pricing-grid">
        <div className="pricing-grid__packages">
          <div className="section-heading section-heading--compact" data-reveal>
            <p className="section-label">Websites & packages</p>
            <h2>Simple Packages. Premium Results.</h2>
            <p>Transparent pricing for custom direction that is built to convert.</p>
          </div>

          <div className="packages-grid">
            {packages.map((pkg) => (
              <article className={pkg.featured ? 'package-card package-card--featured' : 'package-card'} key={pkg.title} data-reveal>
                {pkg.featured ? <span className="package-card__badge">Most Popular</span> : null}
                <h3>{pkg.title}</h3>
                <p className="package-card__description">{pkg.description}</p>
                <strong className="package-card__price">{pkg.price}</strong>
                <ul className="check-list">
                  {pkg.includes.map((item) => (
                    <li key={item}>
                      <Check size={15} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <PackageAction pkg={pkg} context="pricing" />
              </article>
            ))}
          </div>
        </div>

        <aside className="addons-panel" data-reveal>
          <div className="addons-panel__inner">
            <p className="section-label">Add-ons</p>
            <div className="addons-panel__list">
              {addOns.map((addon, index) => (
                <div className="addon-row" key={addon.name} tabIndex={0} style={{ '--addon-offset': `${index * -0.9}s` } as CSSProperties}>
                  <div className="addon-row__flip">
                    <div className="addon-row__face addon-row__face--front">
                      <span>{addon.name}</span>
                      <strong>{addon.price}</strong>
                    </div>
                    <div className="addon-row__face addon-row__face--back" aria-hidden="true">
                      <span>{addon.name}</span>
                      <strong>{addon.price}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="addons-panel__cta">
              <h3>Need something custom?</h3>
              <p>Let us build exactly what you need.</p>
              <a className="project-link" href={intakeFormUrl} target="_blank" rel="noreferrer">
                Contact Us
                <ArrowUpRight size={15} />
              </a>
            </div>
          </div>
        </aside>
      </div>

      <div className="container pricing-note" data-reveal>
        <p>Every project is built custom - no templates, no shortcuts. Designed to feel premium, perform fast, and convert.</p>
      </div>
    </section>
  );
}
