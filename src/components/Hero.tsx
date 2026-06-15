import { ArrowUpRight, Eye, Headphones, Sparkles, TimerReset } from 'lucide-react';
import { assets } from '../data/assets';

type HeroProps = {
  intakeFormUrl: string;
};

export function Hero({ intakeFormUrl }: HeroProps) {
  return (
    <section className="section hero" id="home">
      <div className="hero__backdrop" aria-hidden="true">
        <video className="hero__backdrop-media" autoPlay loop muted playsInline preload="metadata" poster={assets.heroBanner}>
          <source src={assets.heroVideo} type="video/mp4" />
        </video>
        <div className="hero__backdrop-fade" />
      </div>
      <div className="container hero__grid">
        <div className="hero__copy" data-reveal>
          <p className="section-label">Premium web design & development</p>
          <h1>
            Luxury websites{' '}
            <span>built to</span>{' '}
            convert attention{' '}
            <span>into bookings.</span>
          </h1>
          <p className="hero__lede">
            Custom websites for creators, models, brands, and businesses that need a sharper presence online. Designed to look refined, load fast, and bring in the right inquiries.
          </p>

          <div className="hero__actions">
            <a className="button button--primary button--large" href={intakeFormUrl} target="_blank" rel="noreferrer">
              Start Your Website
              <ArrowUpRight size={18} />
            </a>
            <a className="button button--secondary button--large" href="#work">
              View Our Work
              <Eye size={18} />
            </a>
          </div>

          <div className="hero__badges">
            <div className="badge">
              <Sparkles size={16} />
              <div>
                <strong>Conversion Focused</strong>
                <span>Built to book more</span>
              </div>
            </div>
            <div className="badge">
              <Sparkles size={16} />
              <div>
                <strong>Premium Design</strong>
                <span>Luxury. Modern. Strategic.</span>
              </div>
            </div>
            <div className="badge">
              <TimerReset size={16} />
              <div>
                <strong>Fast Turnaround</strong>
                <span>Launch in as little as 7 days</span>
              </div>
            </div>
            <div className="badge">
              <Headphones size={16} />
              <div>
                <strong>Ongoing Support</strong>
                <span>We are here after launch</span>
              </div>
            </div>
          </div>
        </div>
        <div className="hero__visual" data-reveal aria-hidden="true" />
      </div>
    </section>
  );
}
