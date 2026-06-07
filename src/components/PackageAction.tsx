import { ArrowUpRight } from 'lucide-react';
import { type Package } from '../data/pricing';
import { intakeFormUrl } from '../data/site';

type PackageActionProps = {
  pkg: Package;
};

export function PackageAction({ pkg }: PackageActionProps) {
  if (pkg.checkoutUrl) {
    return (
      <form className="purchase-form" action={pkg.checkoutUrl} method="post" target="_blank">
        <button className="button button--primary button--full purchase-form__button" type="submit">
          {pkg.cta}
          <ArrowUpRight size={16} />
        </button>
        <img
          className="purchase-form__cards"
          src="https://www.paypalobjects.com/images/Debit_Credit_APM.svg"
          alt="Accepted debit and credit cards"
        />
        <section className="purchase-form__powered-by" aria-label="Powered by PayPal">
          Powered by
          <img
            src="https://www.paypalobjects.com/paypal-ui/logos/svg/paypal-wordmark-color.svg"
            alt="PayPal"
          />
        </section>
      </form>
    );
  }

  return (
    <a
      className={pkg.featured ? 'button button--primary button--full' : 'button button--ghost button--full'}
      href={intakeFormUrl}
      target="_blank"
      rel="noreferrer"
    >
      {pkg.cta}
      <ArrowUpRight size={16} />
    </a>
  );
}
