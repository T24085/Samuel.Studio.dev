import { ExternalLink, X } from 'lucide-react';
import { allProjects } from '../data/projects';

type ProjectsModalProps = {
  open: boolean;
  onClose: () => void;
};

export function ProjectsModal({ open, onClose }: ProjectsModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal modal--projects" role="dialog" aria-modal="true" aria-labelledby="projects-modal-title" onClick={(event) => event.stopPropagation()}>
        <button className="modal__close" type="button" aria-label="Close projects modal" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="modal__header">
          <p className="section-label">Project archive</p>
          <h2 id="projects-modal-title">All Projects</h2>
          <p className="modal__lede">
            Featured work up top, plus the earlier projects that were replaced from the main section.
          </p>
        </div>

        <div className="project-archive-grid project-archive-grid--modal">
          {allProjects.map((project) => (
            <article className={`project-archive-card${project.legacy ? ' project-archive-card--legacy' : ''}`} key={`${project.title}-${project.legacy ? 'legacy' : 'live'}`}>
              <a className="project-archive-card__media" href={project.url} target="_blank" rel="noreferrer" aria-label={`Open ${project.title}`}>
                <img className="project-archive-card__image" src={project.previewImage} alt={`${project.title} preview`} loading="lazy" decoding="async" />
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
  );
}
