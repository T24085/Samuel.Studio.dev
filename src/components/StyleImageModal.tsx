import { X } from 'lucide-react';
import type { StyleItem } from '../data/styles';

type StyleImageModalProps = {
  item: StyleItem | null;
  onClose: () => void;
};

export function StyleImageModal({ item, onClose }: StyleImageModalProps) {
  if (!item) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal modal--image" role="dialog" aria-modal="true" aria-labelledby="style-image-modal-title" onClick={(event) => event.stopPropagation()}>
        <button className="modal__close" type="button" aria-label="Close image preview" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="modal__header style-image-modal__header">
          <p className="section-label">Mockup preview</p>
          <h2 id="style-image-modal-title">{item.title}</h2>
          <p className="modal__lede">{item.description}</p>
        </div>

        <figure className="style-image-modal__figure">
          <img className="style-image-modal__image" src={item.image} alt={`${item.title} full-size mockup`} />
        </figure>
      </div>
    </div>
  );
}
