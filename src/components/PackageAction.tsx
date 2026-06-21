import { ArrowUpRight } from 'lucide-react';
import { type Package } from '../data/pricing';
import { intakeFormUrl } from '../data/site';

type PackageActionProps = {
  pkg: Package;
  context?: 'pricing' | 'modal';
};

export function PackageAction({ pkg, context = 'pricing' }: PackageActionProps) {
  if (pkg.checkoutUrl) {
    return (
      <a className="button button--primary button--full" href={pkg.checkoutUrl} target="_blank" rel="noreferrer">
        Pay Deposit
        <ArrowUpRight size={16} />
      </a>
    );
  }

  if (context === 'modal') {
    return (
      <a className="button button--secondary button--full" href="#pricing">
        Purchase in pricing section
        <ArrowUpRight size={16} />
      </a>
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
