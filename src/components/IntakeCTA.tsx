import { ArrowUpRight } from 'lucide-react';
import { assets } from '../data/assets';
import { intakeFormUrl } from '../data/site';

export function IntakeCTA() {
  return (
    <section className="section" id="contact">
      <div className="container intake-cta">
        <div className="intake-cta__copy" data-reveal>
          <p className="section-label">Start here</p>
          <h2>Ready to build your site?</h2>
          <p>
            Send the intake form and share the direction, scope, and goals. We will recommend the package and approach that fit best.
          </p>
          <div className="intake-cta__actions">
            <a className="button button--primary button--large" href={intakeFormUrl} target="_blank" rel="noreferrer">
              Open Intake Form
              <ArrowUpRight size={18} />
            </a>
            <a className="button button--secondary button--large" href="#pricing">
              View Packages
            </a>
            <span>About 5 minutes.</span>
          </div>
        </div>

        <div className="intake-cta__visual" data-reveal>
          <img src={assets.contactBanner} alt="Samuel Studio contact banner" />
        </div>
      </div>
    </section>
  );
}
