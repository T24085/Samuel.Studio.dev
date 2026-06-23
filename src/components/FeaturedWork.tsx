import { ArrowUpRight, ExternalLink } from 'lucide-react';
import { projects } from '../data/projects';

export function FeaturedWork() {
  return (
    <section className="section" id="work">
      <div className="featured-work__shell">
        <div className="featured-work__header section-heading" data-reveal>
          <p className="section-label">Featured work</p>
          <h2>Recent Projects</h2>
          <p>A curated selection of websites designed to elevate brands and deliver measurable results.</p>
        </div>

        <div className="projects-grid">
          {projects.map((project, index) => {
            return (
              <article className="project-card" key={project.title} data-reveal>
                <div className={`project-card__thumb project-card__thumb--live project-card__thumb--${project.accent}`}>
                  <div className="project-card__window">
                    <div className="project-card__window-bar">
                      <span />
                      <span />
                      <span />
                    </div>
                    <img
                      className="project-card__preview-image"
                      src={project.previewImage}
                      alt={`${project.title} screenshot preview`}
                      loading="lazy"
                      decoding="async"
                    />
                    <iframe
                      title={`${project.title} live preview`}
                      src={project.url}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
                    />
                  </div>
                  <div className="project-card__live-label">
                    <span className="project-card__rank">{String(index + 1).padStart(2, '0')}</span>
                    <strong>Live view</strong>
                  </div>
                </div>
                <div className="project-card__body">
                  <div className="project-card__meta">
                    <h3>{project.title}</h3>
                    <span>{project.category}</span>
                  </div>
                  {index === 0 ? <span className="project-card__featured-tag">Featured</span> : null}
                  <p>{project.description}</p>
                  <div className="project-card__actions">
                    <a className="button button--secondary button--small project-link" href={project.url} target="_blank" rel="noreferrer">
                      Visit Site
                      <ExternalLink size={15} />
                    </a>
                    <a className="button button--ghost button--small project-link project-link--subtle" href={project.url} target="_blank" rel="noreferrer">
                      View Case Study
                      <ArrowUpRight size={15} />
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
