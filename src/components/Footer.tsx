import { ArrowUpRight, Camera, Mail, MapPin, MessageCircle, Play } from 'lucide-react';
import { assets } from '../data/assets';
import { emailAddress, intakeFormUrl, navItems } from '../data/site';

export function Footer() {
  const desktopVersionUrl = typeof window !== 'undefined' ? window.location.origin : '/';

  return (
    <footer className="footer">
      <div className="container footer__grid" data-reveal>
        <div className="footer__brand">
          <div className="footer__logoRow">
            <img className="footer__avatar" src={assets.profile} alt="Samuel Studio profile portrait" />
            <div>
              <p className="footer__logo">SAMUEL STUDIO</p>
              <p>Refined websites with a clear point of view.</p>
            </div>
          </div>
          <p className="footer__line">
            Samuel Studio builds custom websites that help brands look sharper, communicate clearly, and turn interest into action.
          </p>
        </div>

        <div className="footer__links">
          <p>Links</p>
          {navItems.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </div>

        <div className="footer__contact">
          <p>Contact</p>
          <a href={`mailto:${emailAddress}`}>
            <Mail size={16} />
            {emailAddress}
          </a>
          <span>
            <MapPin size={16} />
            Worldwide
          </span>
          <div className="footer__socials" aria-label="Social links">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
              <Camera size={18} />
            </a>
            <a href="https://x.com" target="_blank" rel="noreferrer" aria-label="X">
              <MessageCircle size={18} />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube">
              <Play size={18} />
            </a>
          </div>
        </div>

        <div className="footer__cta">
          <a className="button button--primary button--full" href={intakeFormUrl} target="_blank" rel="noreferrer">
            Start Your Website
            <ArrowUpRight size={16} />
          </a>
          <a className="footer__desktopLink" href={desktopVersionUrl} target="_blank" rel="noreferrer">
            View desktop version
            <ArrowUpRight size={14} />
          </a>
        </div>
      </div>

      <div className="container footer__bottom" data-reveal>
        <span>© 2026 Samuel Studio. All rights reserved.</span>
        <span>Built for brands that value clarity and taste.</span>
      </div>
    </footer>
  );
}
