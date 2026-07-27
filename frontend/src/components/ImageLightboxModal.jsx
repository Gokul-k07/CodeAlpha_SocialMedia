import { useState, useRef, useEffect, useCallback } from 'react';
import { FiX, FiDownload, FiShare2, FiRotateCcw } from 'react-icons/fi';
import { useToast } from './ToastProvider';

export default function ImageLightboxModal({ imageUrl, onClose }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isPinching, setIsPinching] = useState(false);

  const { addToast } = useToast();

  const isPinchingRef = useRef(false);
  const lastTapRef = useRef(0);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialOffsetRef = useRef({ x: 0, y: 0 });
  const initialDistRef = useRef(0);
  const initialScaleRef = useRef(1);
  const pinchTimeoutRef = useRef(null);

  const resetZoom = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => resetZoom());
  }, [imageUrl, resetZoom]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!imageUrl) return null;

  const handleBackdropClick = (e) => {
    if (isPinchingRef.current) return;
    if (e.target.classList.contains('lightbox-backdrop') || e.target.classList.contains('lightbox-content-wrapper')) {
      if (scale === 1) {
        onClose?.();
      } else {
        resetZoom();
      }
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setScale((prev) => {
      const next = Math.min(4, Math.max(1, prev + delta));
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  };

  // Mouse Drag Panning
  const handleMouseDown = (e) => {
    if (scale <= 1 || e.button !== 0) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialOffsetRef.current = { ...offset };
  };

  const handleMouseMove = (e) => {
    if (!isDragging || scale <= 1) return;
    e.preventDefault();
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setOffset({
      x: initialOffsetRef.current.x + dx,
      y: initialOffsetRef.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Pinch-to-Zoom & Pan Handlers
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      isPinchingRef.current = true;
      setIsPinching(true);
      if (pinchTimeoutRef.current) clearTimeout(pinchTimeoutRef.current);

      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

      initialDistRef.current = dist;
      initialScaleRef.current = scale;
      initialOffsetRef.current = { ...offset };
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      dragStartRef.current = { x: touch.clientX, y: touch.clientY };
      initialOffsetRef.current = { ...offset };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2) {
      isPinchingRef.current = true;
      setIsPinching(true);
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

      if (initialDistRef.current > 0) {
        const factor = dist / initialDistRef.current;
        const newScale = Math.min(4, Math.max(1, initialScaleRef.current * factor));
        setScale(newScale);
        if (newScale === 1) setOffset({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && scale > 1 && !isPinchingRef.current) {
      e.preventDefault();
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartRef.current.x;
      const dy = touch.clientY - dragStartRef.current.y;
      setOffset({
        x: initialOffsetRef.current.x + dx,
        y: initialOffsetRef.current.y + dy,
      });
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2 && isPinchingRef.current) {
      if (pinchTimeoutRef.current) clearTimeout(pinchTimeoutRef.current);
      pinchTimeoutRef.current = setTimeout(() => {
        isPinchingRef.current = false;
        setIsPinching(false);
      }, 350);
    }
  };

  const handleImageClick = (e) => {
    e.stopPropagation();
    if (isPinchingRef.current) return;

    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap -> Toggle 1x / 2.5x
      if (scale > 1) {
        resetZoom();
      } else {
        setScale(2.5);
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  // Actions
  const handleDownload = async (e) => {
    e.stopPropagation();
    try {
      if (imageUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `gosocial-image-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const response = await fetch(imageUrl, { mode: 'cors' });
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `gosocial-image-${Date.now()}.${blob.type.split('/')[1] || 'jpg'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }
      addToast('Image downloaded successfully.', 'success');
    } catch {
      // Fallback direct window open if cross-origin fetch is blocked
      window.open(imageUrl, '_blank');
      addToast('Opened image in new tab.', 'info');
    }
  };

  const handleCopyLink = (e) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(imageUrl);
      addToast('Image link copied to clipboard!', 'success');
    } else {
      addToast('Unable to copy link.', 'error');
    }
  };

  return (
    <div className="lightbox-backdrop" onClick={handleBackdropClick}>
      {/* Top Toolbar Actions */}
      <div className="lightbox-toolbar" onClick={(e) => e.stopPropagation()}>
        {scale > 1 && (
          <button
            type="button"
            className="lightbox-action-btn"
            onClick={resetZoom}
            title="Reset Zoom"
            aria-label="Reset zoom"
          >
            <FiRotateCcw size={20} />
          </button>
        )}
        <button
          type="button"
          className="lightbox-action-btn"
          onClick={handleDownload}
          title="Download Image"
          aria-label="Download image"
        >
          <FiDownload size={20} />
        </button>
        <button
          type="button"
          className="lightbox-action-btn"
          onClick={handleCopyLink}
          title="Copy Link / Share"
          aria-label="Copy image link"
        >
          <FiShare2 size={20} />
        </button>
        <button
          type="button"
          className="lightbox-action-btn"
          onClick={onClose}
          title="Close Lightbox"
          aria-label="Close lightbox"
        >
          <FiX size={22} />
        </button>
      </div>

      <div
        className="lightbox-content-wrapper"
        onClick={handleBackdropClick}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={imageUrl}
          alt="Expanded media view"
          className="lightbox-expanded-img"
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0px) scale(${scale})`,
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
            transition: isDragging || isPinching ? 'none' : 'transform 0.15s ease-out',
          }}
          onClick={handleImageClick}
        />
      </div>
    </div>
  );
}
