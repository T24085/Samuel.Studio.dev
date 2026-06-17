import { ArrowUpRight, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { addOns, packages, type AddOn, type Package } from '../data/pricing';
import { intakeFormUrl } from '../data/site';
import { ProjectQuoteBuilder } from './ProjectQuoteBuilder';

const projectQuoteStorageKey = 'samuelStudioProjectQuote';

type StoredPackageSelection = {
  id: string;
  name: string;
  price: number;
};

type StoredAddOnSelection = {
  id: string;
  name: string;
  internalName: string;
  price: number;
};

type StoredProjectQuote = {
  selectedPackage: StoredPackageSelection | null;
  selectedAddons: StoredAddOnSelection[];
  estimatedTotal: number;
};

type LoadedProjectQuote = {
  selectedPackageId: string | null;
  selectedAddonIds: string[];
};

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

function loadStoredQuote(): LoadedProjectQuote {
  if (typeof window === 'undefined') {
    return { selectedPackageId: null, selectedAddonIds: [] };
  }

  try {
    const raw = window.localStorage.getItem(projectQuoteStorageKey);

    if (!raw) {
      return { selectedPackageId: null, selectedAddonIds: [] };
    }

    const parsed = JSON.parse(raw) as Partial<StoredProjectQuote>;
    const selectedPackageId = typeof parsed.selectedPackage?.id === 'string' ? parsed.selectedPackage.id : null;
    const selectedAddonIds = Array.isArray(parsed.selectedAddons)
      ? parsed.selectedAddons
          .map((addon) => (typeof addon?.id === 'string' ? addon.id : null))
          .filter((id): id is string => Boolean(id))
      : [];

    return { selectedPackageId, selectedAddonIds };
  } catch {
    return { selectedPackageId: null, selectedAddonIds: [] };
  }
}

function buildStoredQuote(selectedPackage: Package | null, selectedAddOns: AddOn[]): StoredProjectQuote {
  const selectedPackagePayload = selectedPackage
    ? {
        id: selectedPackage.id,
        name: selectedPackage.title,
        price: selectedPackage.priceValue ?? 0,
      }
    : null;

  const selectedAddOnsPayload = selectedAddOns.map((addon) => ({
    id: addon.id,
    name: addon.name,
    internalName: addon.internalName,
    price: addon.priceValue,
  }));

  const oneTimeAddOnTotal = selectedAddOns
    .filter((addon) => addon.billing === 'one-time')
    .reduce((sum, addon) => sum + addon.priceValue, 0);

  return {
    selectedPackage: selectedPackagePayload,
    selectedAddons: selectedAddOnsPayload,
    estimatedTotal: (selectedPackage?.priceValue ?? 0) + oneTimeAddOnTotal,
  };
}

function scrollToProjectBuilder() {
  window.setTimeout(() => {
    document.getElementById('project-builder')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 0);
}

function PackageCard({
  pkg,
  selected,
  onSelect,
}: {
  pkg: Package;
  selected: boolean;
  onSelect: (pkg: Package) => void;
}) {
  return (
    <article
      className={
        selected
          ? pkg.id === 'custom'
            ? 'package-card package-card--custom package-card--featured package-card--selected'
            : 'package-card package-card--featured package-card--selected'
          : pkg.featured
            ? pkg.id === 'custom'
              ? 'package-card package-card--custom package-card--featured'
              : 'package-card package-card--featured'
            : 'package-card'
      }
      key={pkg.id}
      data-reveal
    >
      {pkg.featured ? <span className="package-card__badge">Most Popular</span> : null}
      {selected ? <span className="package-card__selectedTag">Selected</span> : null}

      <div className="package-card__top">
        <div>
          <p className="package-card__eyebrow">Best for</p>
          <div className="package-card__chips" aria-label={`${pkg.title} best for`}>
            {pkg.bestFor.slice(0, 3).map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
        <strong className="package-card__price">{pkg.price}</strong>
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
              <span>What you get</span>
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

      <button
        className={selected || pkg.featured ? 'button button--primary button--full' : 'button button--secondary button--full'}
        type="button"
        onClick={() => onSelect(pkg)}
        aria-pressed={selected}
      >
        {pkg.cta}
        <ArrowUpRight size={16} />
      </button>
    </article>
  );
}

function AddOnCard({
  addon,
  selected,
  onToggle,
}: {
  addon: AddOn;
  selected: boolean;
  onToggle: (addon: AddOn) => void;
}) {
  return (
    <article className={selected ? 'upgrade-card upgrade-card--selected' : 'upgrade-card'} data-reveal>
      <div className="upgrade-card__top">
        <div>
          <p className="upgrade-card__eyebrow">{addon.internalName}</p>
          <h3>{addon.name}</h3>
        </div>
        <strong className="upgrade-card__price">{addon.price}</strong>
      </div>

      <p className="upgrade-card__description">{addon.description}</p>

      <p className="upgrade-card__helper">{addon.bestFor}</p>

      <button className={selected ? 'button button--primary button--full' : 'button button--secondary button--full'} type="button" onClick={() => onToggle(addon)}>
        {selected ? 'Added to Quote' : 'Add to Project Quote'}
        <ArrowUpRight size={16} />
      </button>
    </article>
  );
}

export function Pricing() {
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(() => loadStoredQuote().selectedPackageId);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>(() => loadStoredQuote().selectedAddonIds);

  const selectedPackage = packages.find((pkg) => pkg.id === selectedPackageId) ?? null;
  const visiblePackages = packages.filter((pkg) => pkg.id !== 'custom');
  const selectedAddOns = addOns.filter((addon) => selectedAddonIds.includes(addon.id));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(projectQuoteStorageKey, JSON.stringify(buildStoredQuote(selectedPackage, selectedAddOns)));
  }, [selectedPackage, selectedAddOns]);

  const handleSelectPackage = (pkg: Package) => {
    setSelectedPackageId(pkg.id);
    scrollToProjectBuilder();
  };

  const handleToggleAddon = (addon: AddOn) => {
    setSelectedAddonIds((current) => {
      if (current.includes(addon.id)) {
        return current.filter((id) => id !== addon.id);
      }

      return [...current, addon.id];
    });
  };

  const handleRemoveAddon = (addonId: string) => {
    setSelectedAddonIds((current) => current.filter((id) => id !== addonId));
  };

  return (
    <section className="section pricing-section" id="pricing">
      <div className="container pricing-section__intro" data-reveal>
        <p className="section-label">Website pricing</p>
        <h2>Simple Website Packages for Real Businesses</h2>
        <p>
          Choose the starting point that fits your business. You can add features like SEO, booking, content help, or
          lead capture as your project grows.
        </p>
      </div>

      <div className="pricing-layout pricing-layout--fullbleed">
        <div className="pricing-layout__main">
          <div className="pricing-section__block" id="pricing-packages" data-reveal>
            <div className="pricing-layout__heading">
              <h3>Choose a package</h3>
              <p>Start with the best fit, then add extras only where they help the business actually grow.</p>
            </div>

            <div className="packages-grid">
              {visiblePackages.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} selected={pkg.id === selectedPackageId} onSelect={handleSelectPackage} />
              ))}
            </div>
          </div>

          <article className="pricing-custom-quote" data-reveal>
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
              <h3>Add Features That Help Your Website Do More</h3>
              <p>
                Need more than a basic website? Add tools that help customers find you, contact you, book with you, or
                buy from you online.
              </p>
            </div>

            <div className="upgrade-grid">
              {addOns.map((addon) => (
                <AddOnCard key={addon.id} addon={addon} selected={selectedAddonIds.includes(addon.id)} onToggle={handleToggleAddon} />
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

        <ProjectQuoteBuilder
          selectedPackage={selectedPackage}
          selectedAddOns={selectedAddOns}
          onChangePackage={() => {
            document.getElementById('pricing-packages')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          onRemoveAddOn={handleRemoveAddon}
        />
      </div>
    </section>
  );
}
