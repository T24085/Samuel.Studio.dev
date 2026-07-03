import { ArrowUpRight, ExternalLink } from 'lucide-react';
import { allProjects, featuredProjects } from '../data/projects';

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
          {featuredProjects.map((project, index) => {
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

        <div className="featured-work__footer" data-reveal>
          <a className="button button--secondary button--large" href="#all-projects">
            View All Projects
            <ArrowUpRight size={18} />
          </a>
          <p>Browse the live featured lineup and the full archive, including the earlier project versions.</p>
        </div>

        <div className="featured-work__archive" id="all-projects">
          <div className="featured-work__archive-header section-heading section-heading--compact" data-reveal>
            <p className="section-label">Project archive</p>
            <h2>All Projects</h2>
            <p>Everything in one place, including the projects that were swapped out of the featured lineup.</p>
          </div>

          <div className="project-archive-grid">
            {allProjects.map((project) => (
              <article className={`project-archive-card${project.legacy ? ' project-archive-card--legacy' : ''}`} key={`${project.title}-${project.legacy ? 'legacy' : 'live'}`} data-reveal>
                <a className="project-archive-card__media" href={project.url} target="_blank" rel="noreferrer" aria-label={`Open ${project.title}`}>
                  <img
                    className="project-archive-card__image"
                    src={project.previewImage}
                    alt={`${project.title} preview`}
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="project-archive-card__badge">{project.legacy ? 'Legacy' : 'Live'}</span>
                </a>
                <div className="project-archive-card__body">
                  <div className="project-card__meta">
                    <h3>{project.title}</h3>
                    <span>{project.category}</span>
                  </div>
                  <p>{project.description}</p>
                  <div className="project-archive-card__actions">
                    <a className="button button--ghost button--small project-link project-archive-card__button" href={project.url} target="_blank" rel="noreferrer">
                      Visit Site
                      <ExternalLink size={15} />
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
