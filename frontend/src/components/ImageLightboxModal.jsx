import { useState } from 'react';
import { FiX } from 'react-icons/fi';

export default function ImageLightboxModal({ imageUrl, onClose }) {
  const [scale, setScale] = useState(1);

  if (!imageUrl) return null;

  const handleImageClick = (e) => {
    e.stopPropagation();
    // Cycle zoom levels on click: 1x -> 1.8x -> 2.5x -> 1x (No zoom icon rendered)
    setScale((prev) => (prev === 1 ? 1.8 : prev === 1.8 ? 2.5 : 1));
  };

  const handleWheel = (e) => {
    e.stopPropagation();
    if (e.deltaY < 0) {
      setScale((prev) => Math.min(3, prev + 0.25));
    } else {
      setScale((prev) => Math.max(1, prev - 0.25));
    }
  };

  return (
    <div className="lightbox-backdrop" onClick={onClose}>
      <button type="button" className="lightbox-close-btn" onClick={onClose} aria-label="Close lightbox">
        <FiX />
      </button>

      <div className="lightbox-content-wrapper" onClick={(e) => e.stopPropagation()} onWheel={handleWheel}>
        <img
          src={imageUrl}
          alt="Expanded post content"
          className="lightbox-expanded-img"
          style={{ transform: `scale(${scale})`, cursor: scale > 1 ? 'zoom-out' : 'zoom-in' }}
          onClick={handleImageClick}
        />
      </div>
    </div>
  );
}
