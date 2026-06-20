import { ArrowUpRight, Check, FileText, Lock, Plus, X } from 'lucide-react';
import { type AddOn, type Package } from '../data/pricing';
import { intakeFormUrl } from '../data/site';
import { PayPalCartButtons } from './PayPalCartButtons';
import { PayPalSubscriptionButton } from './PayPalSubscriptionButton';

type ProjectQuoteBuilderProps = {
  selectedPackage: Package | null;
  selectedAddOns: AddOn[];
  onChangePackage: () => void;
  onRemoveAddOn: (addonId: string) => void;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function ProjectQuoteBuilder({ selectedPackage, selectedAddOns, onChangePackage, onRemoveAddOn }: ProjectQuoteBuilderProps) {
  const oneTimeAddOns = selectedAddOns.filter((addon) => addon.billing === 'one-time');
  const monthlyAddOns = selectedAddOns.filter((addon) => addon.billing === 'monthly');
  const packageTotal = selectedPackage?.priceValue ?? 0;
  const oneTimeAddOnTotal = oneTimeAddOns.reduce((sum, addon) => sum + addon.priceValue, 0);
  const estimatedTotal = selectedPackage && selectedPackage.priceValue !== null ? packageTotal + oneTimeAddOnTotal : null;

  return (
    <aside className="project-builder" id="project-builder" data-reveal>
      <div className="project-builder__inner">
        <div className="project-builder__header">
          <div className="project-builder__titleRow">
            <span className="project-builder__icon" aria-hidden="true">
              <FileText size={18} />
            </span>
            <div>
              <p className="section-label">Project Builder</p>
              <h3>Build Your Website Plan</h3>
            </div>
          </div>
          <p>Choose your package, add any upgrades, and send your project request. We will review the details before starting.</p>
        </div>

        <div className="project-builder__content">
          <div className="project-builder__section">
            <div className="project-builder__sectionHeader">
              <span className="project-builder__label">Selected Package</span>
              <a
                className="project-builder__link"
                href="#pricing-packages"
                onClick={(event) => {
                  event.preventDefault();
                  onChangePackage();
                }}
              >
                Change package
              </a>
            </div>
            {selectedPackage ? (
              <div className="project-builder__selectedPackage">
                <div>
                  <h4>{selectedPackage.title}</h4>
                  <p>Starting at</p>
                </div>
                <strong>{selectedPackage.price}</strong>
              </div>
            ) : (
              <div className="project-builder__empty">
                <p>Select a website package above to start building your project.</p>
              </div>
            )}
          </div>

          <div className="project-builder__section">
            <span className="project-builder__label">Selected Add-ons</span>
            {selectedAddOns.length === 0 ? (
              <p className="project-builder__emptyCopy">No add-ons selected yet.</p>
            ) : (
              <div className="project-builder__addonList">
                {selectedAddOns.map((addon) => (
                  <article className="project-builder__addonRow" key={addon.id}>
                    <div>
                      <h4>{addon.name}</h4>
                      <p>{addon.internalName}</p>
                      <span>{addon.price}</span>
                    </div>
                    <button
                      className="project-builder__removeButton"
                      type="button"
                      onClick={() => onRemoveAddOn(addon.id)}
                      aria-label={`Remove ${addon.name} from quote`}
                    >
                      <X size={15} />
                    </button>
                  </article>
                ))}
              </div>
            )}

            {monthlyAddOns.length > 0 ? (
              <div className="project-builder__monthlyNote">
                <span>Monthly add-ons billed separately:</span>
                <ul>
                  {monthlyAddOns.map((addon) => (
                    <li key={addon.id}>
                      <Check size={14} />
                      <span>
                        {addon.name} - {addon.price}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="project-builder__addMore" aria-hidden="true">
              <span>
                <Plus size={14} />
                Add more features
              </span>
            </div>
          </div>

          <div className="project-builder__section project-builder__total">
            <span className="project-builder__label">Estimated Starting Total</span>
            {selectedPackage?.priceValue === null ? (
              <strong>Custom Quote</strong>
            ) : selectedPackage ? (
              <strong>{`${formatCurrency(estimatedTotal ?? 0)}+`}</strong>
            ) : (
              <strong>Select a package</strong>
            )}
            <p>Final pricing may vary depending on project size, requested features, content needs, and integrations.</p>
          </div>

          <div className="project-builder__actions">
            <a className="button button--primary button--full" href={intakeFormUrl} target="_blank" rel="noreferrer">
              Continue
              <ArrowUpRight size={16} />
            </a>

            <div className="project-builder__note">
              <Lock size={14} />
              <span>Secure • No payment now</span>
            </div>

            <div className="project-builder__payment" id="project-payment">
              <span className="project-builder__paymentLabel">Pay Deposit / Start Project</span>
              <p>Secure your project with a deposit. Add-ons may require review before final pricing is confirmed.</p>

              {selectedPackage?.cartAddToCartId ? (
                <PayPalCartButtons addToCartId={selectedPackage.cartAddToCartId} />
              ) : (
                <a className="button button--secondary button--full" href={intakeFormUrl} target="_blank" rel="noreferrer">
                  Request a Custom Quote
                  <ArrowUpRight size={16} />
                </a>
              )}

              {monthlyAddOns.length > 0 ? (
                <div className="project-builder__subscription">
                  <span className="project-builder__paymentLabel">Monthly Subscription</span>
                  <p>Any monthly add-ons are billed separately through PayPal.</p>
                  <div className="project-builder__subscriptionList">
                    {monthlyAddOns.map((addon) =>
                      addon.paypalPlanId ? (
                        <div className="project-builder__subscriptionItem" key={addon.id}>
                          <div className="project-builder__subscriptionCopy">
                            <strong>{addon.name}</strong>
                            <span>{addon.price}</span>
                          </div>
                          <PayPalSubscriptionButton planId={addon.paypalPlanId} />
                        </div>
                      ) : (
                        <div className="project-builder__subscriptionItem" key={addon.id}>
                          <div className="project-builder__subscriptionCopy">
                            <strong>{addon.name}</strong>
                            <span>{addon.price}</span>
                          </div>
                          <a className="button button--secondary button--full" href={intakeFormUrl} target="_blank" rel="noreferrer">
                            Request Subscription Setup
                            <ArrowUpRight size={16} />
                          </a>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
