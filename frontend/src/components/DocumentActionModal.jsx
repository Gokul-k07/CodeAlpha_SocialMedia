import { FiX, FiEye, FiDownload, FiFileText } from 'react-icons/fi';

export default function DocumentActionModal({ document: doc, isOpen, onClose }) {
  if (!isOpen || !doc) return null;

  const handleOpen = () => {
    window.open(doc.fileUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = doc.fileUrl;
    link.download = doc.name || 'document';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="doc-action-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiFileText style={{ color: '#6366f1' }} /> Document Options
          </h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close modal">
            <FiX />
          </button>
        </div>

        <div className="doc-action-body">
          <div className="doc-preview-banner">
            <FiFileText size={32} style={{ color: '#6366f1' }} />
            <div>
              <strong style={{ display: 'block', fontSize: '1rem', wordBreak: 'break-all' }}>{doc.name}</strong>
              <small style={{ color: 'var(--text-muted)' }}>{doc.fileType?.toUpperCase()} Document</small>
            </div>
          </div>

          <p style={{ margin: '14px 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            What would you like to do with this file?
          </p>

          <div className="doc-action-buttons">
            <button type="button" className="primary-btn doc-btn" onClick={handleOpen}>
              <FiEye /> Open Document
            </button>
            <button type="button" className="secondary-btn doc-btn" onClick={handleDownload}>
              <FiDownload /> Download Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
