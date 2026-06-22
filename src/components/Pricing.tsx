import {
  ArrowUpRight,
  Bot,
  CalendarDays,
  Check,
  PenLine,
  Search,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Rocket,
  BarChart3,
} from 'lucide-react';
import { addOns, packages, type AddOn, type Package } from '../data/pricing';
import { intakeFormUrl } from '../data/site';

const faqItems = [
  {
    question: 'Do I have to pay everything upfront?',
    answer:
      'No. You can start with a deposit or package payment. Larger projects and add-ons may be reviewed before final pricing is confirmed.',
  },
  {
    question: 'Can I add features later?',
    answer:
      'Yes. You can start with a basic website and add SEO, booking, e-commerce, AI lead capture, or monthly support later.',
  },
  {
    question: 'What if I do not know what package I need?',
    answer: 'Choose the closest option or request a custom quote. Samuel Studio can help recommend the right setup.',
  },
  {
    question: 'Are add-on prices final?',
    answer:
      'Most add-ons are starting prices. Final pricing depends on the size of the project and what needs to be connected or built.',
  },
  {
    question: 'What happens after I submit my request?',
    answer: 'You will be contacted to confirm the project details, timeline, content, and next steps.',
  },
] as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function splitPriceLabel(price: string) {
  const match = price.match(/^(Starting at)\s+(.+)$/i);

  if (match) {
    return { label: match[1], value: match[2] };
  }

  return { label: 'Starting at', value: price };
}

function PackageCard({
  pkg,
}: {
  pkg: Package;
}) {
  const priceParts = splitPriceLabel(pkg.price);
  const packageIcon =
    pkg.id === 'starter' ? (
      <Sparkles size={17} />
    ) : pkg.id === 'professional' ? (
      <Rocket size={17} />
    ) : (
      <BarChart3 size={17} />
    );

  return (
    <article
      className={pkg.featured ? (pkg.id === 'custom' ? 'package-card package-card--custom package-card--featured' : 'package-card package-card--featured') : 'package-card'}
      key={pkg.id}
      data-reveal
    >
      {pkg.featured ? <span className="package-card__badge">Most Popular</span> : null}

      <div className="package-card__top">
        <div>
          <p className="package-card__eyebrow">Best for</p>
          <div className="package-card__chips" aria-label={`${pkg.title} best for`}>
            {pkg.bestFor.slice(0, 3).map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
        <div className="package-card__priceGroup">
          <span className="package-card__priceLabel">{priceParts.label}</span>
          <strong className="package-card__priceValue">{priceParts.value}</strong>
        </div>
      </div>

      <div className="package-card__body">
        <div>
          <h3>{pkg.title}</h3>
          <p className="package-card__description">{pkg.description}</p>
        </div>

        {pkg.id === 'custom' ? (
          <div className="package-card__result package-card__result--compact">
            <span>Best fit</span>
            <p>{pkg.customerFacingExplanation}</p>
          </div>
        ) : (
          <>
            <div className="package-card__result">
              <span className="package-card__resultIcon" aria-hidden="true">
                {packageIcon}
              </span>
              <p>{pkg.customerFacingExplanation}</p>
            </div>

            <ul className="check-list">
              {pkg.includes.slice(0, 6).map((item) => (
                <li key={item}>
                  <Check size={15} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <a
        className={pkg.featured ? 'button button--primary button--full' : 'button button--secondary button--full'}
        href={pkg.checkoutUrl ?? intakeFormUrl}
        target="_blank"
        rel="noreferrer"
      >
        {pkg.id === 'custom' ? 'Request a Custom Quote' : pkg.cta}
        <ArrowUpRight size={16} />
      </a>
    </article>
  );
}

function AddOnCard({
  addon,
}: {
  addon: AddOn;
}) {
  const priceParts = splitPriceLabel(addon.price);
  const icon =
    addon.id === 'seo' ? (
      <Search size={18} />
    ) : addon.id === 'lead-assistant' ? (
      <Bot size={18} />
    ) : addon.id === 'booking' ? (
      <CalendarDays size={18} />
    ) : addon.id === 'commerce' ? (
      <ShoppingCart size={18} />
    ) : addon.id === 'copy' ? (
      <PenLine size={18} />
    ) : (
      <ShieldCheck size={18} />
    );

  return (
    <article
      className={`${'upgrade-card'}${addon.billing === 'monthly' ? ' upgrade-card--monthly' : ''}`}
      data-billing={addon.billing}
      data-reveal
    >
      <div className="upgrade-card__top">
        <div className="upgrade-card__identity">
          <span className="upgrade-card__icon">{icon}</span>
          <div>
            <p className="upgrade-card__eyebrow">{addon.internalName}</p>
            <h3>{addon.name}</h3>
          </div>
        </div>
        <div className="upgrade-card__priceGroup">
          <span className="upgrade-card__priceLabel">{priceParts.label}</span>
          <strong className="upgrade-card__priceValue">{priceParts.value}</strong>
        </div>
      </div>

      <p className="upgrade-card__description">{addon.description}</p>

      <a className="button button--secondary button--full" href={addon.checkoutUrl ?? intakeFormUrl} target="_blank" rel="noreferrer">
        {addon.billing === 'monthly' ? 'Subscribe with PayPal' : 'Pay with PayPal'}
        <ArrowUpRight size={16} />
      </a>
    </article>
  );
}

export function Pricing() {
  const visiblePackages = packages.filter((pkg) => pkg.id !== 'custom');

  return (
    <section className="section pricing-section" id="pricing">
      <div className="container pricing-section__intro" data-reveal>
        <p className="section-label">Website Packages</p>
        <h2>Simple Website Packages for Real Businesses</h2>
        <p>
          Choose a starting package that fits your goals, then add only the features you need.
          Everything is built to help you attract customers and grow online.
        </p>
      </div>

      <div className="pricing-layout pricing-layout--fullbleed">
        <div className="pricing-layout__main">
          <div className="pricing-section__block" id="pricing-packages" data-reveal>
            <div className="packages-grid">
              {visiblePackages.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} />
              ))}
            </div>
          </div>

          <article className="pricing-custom-quote" data-reveal>
            <span className="pricing-custom-quote__icon" aria-hidden="true">
              <SlidersHorizontal size={18} />
            </span>
            <div className="pricing-custom-quote__copy">
              <p className="pricing-custom-quote__eyebrow">Custom Quote</p>
              <h3>Need something custom?</h3>
              <p>
                For e-commerce, memberships, advanced booking systems, dashboards, web apps, or larger websites.
              </p>
            </div>
            <a className="button button--secondary" href={intakeFormUrl} target="_blank" rel="noreferrer">
              Request a Custom Quote
              <ArrowUpRight size={16} />
            </a>
          </article>

          <div className="pricing-section__block" data-reveal>
            <div className="pricing-layout__heading">
              <p className="section-label">Add Features</p>
              <h3>Add Features That Help Your Website Do More</h3>
              <p>Powerful add-ons to help customers find you, contact you, book with you, or buy from you online.</p>
            </div>

            <div className="upgrade-grid">
              {addOns.map((addon) => (
                <AddOnCard key={addon.id} addon={addon} />
              ))}
            </div>
          </div>

          <div className="pricing-faq" data-reveal>
            <div className="pricing-layout__heading">
              <h3>FAQ</h3>
              <p>Quick answers to the most common pricing questions.</p>
            </div>

            <div className="pricing-faq__list">
              {faqItems.map((item) => (
                <details className="pricing-faq__item" key={item.question}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
