import { useState, useRef } from 'react';
import { FiPlus, FiX, FiImage, FiFileText, FiGlobe, FiLock, FiTrash2, FiHash, FiAtSign } from 'react-icons/fi';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ToastProvider';
import LoadingSpinner from './LoadingSpinner';

export default function PostComposerModal({ isOpen, onClose, onPostCreated }) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [caption, setCaption] = useState('');
  const [images, setImages] = useState([]);
  const [imageUrlDraft, setImageUrlDraft] = useState('');
  const [showImageUrlInput, setShowImageUrlInput] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [visibility, setVisibility] = useState('anyone');
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const docInputRef = useRef(null);
  const imageInputRef = useRef(null);

  if (!isOpen) return null;

  const handleAddImageUrl = (e) => {
    e.preventDefault();
    const trimmed = imageUrlDraft.trim();
    if (!trimmed) return;
    setImages((prev) => [...prev, trimmed]);
    setImageUrlDraft('');
    setShowImageUrlInput(false);
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      // Validate file size (< 10MB)
      if (file.size > 10 * 1024 * 1024) {
        addToast(`File ${file.name} exceeds maximum 10MB limit.`, 'error');
        return;
      }

      // Check allowed document extensions
      const ext = file.name.split('.').pop().toLowerCase();
      const allowedExts = ['pdf', 'doc', 'docx'];
      if (!allowedExts.includes(ext)) {
        addToast(`Only PDF, DOC, and DOCX documents are allowed.`, 'error');
        return;
      }

      const fileUrl = URL.createObjectURL(file);
      setAttachments((prev) => [
        ...prev,
        {
          name: file.name,
          fileUrl,
          fileType: ext,
          fileSize: file.size,
        },
      ]);
    });

    if (docInputRef.current) docInputRef.current.value = '';
  };

  const handleRemoveAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddHashtag = (tag) => {
    setCaption((prev) => (prev ? `${prev} ${tag}` : tag));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const hasCaption = caption.trim().length > 0;
    const hasImages = images.length > 0;
    const hasDocs = attachments.length > 0;

    if (!hasCaption && !hasImages && !hasDocs) {
      addToast('Cannot publish an empty post. Please add text, images, or documents.', 'error');
      return;
    }

    setPublishing(true);
    try {
      const res = await api.post('/posts', {
        caption: caption.trim(),
        images,
        image: images[0] || '',
        attachments,
        visibility,
      });

      addToast('Post published successfully!', 'success');
      if (onPostCreated && res.data.post) {
        onPostCreated(res.data.post);
      }
      onClose();
      // Reset form
      setCaption('');
      setImages([]);
      setAttachments([]);
      setVisibility('anyone');
    } catch (err) {
      addToast(err.response?.data?.message || 'Unable to publish post.', 'error');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="composer-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create Post</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close modal">
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="composer-modal-form">
          <div className="composer-user-row">
            <img src={user?.avatar} alt="avatar" className="avatar" />
            <div>
              <strong>{user?.fullname}</strong>
              <div className="visibility-selector">
                <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                  <option value="anyone">🌐 Anyone</option>
                  <option value="followers">🔒 Only followers</option>
                </select>
              </div>
            </div>
          </div>

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="What's on your mind? Type @username to mention creators or #hashtag..."
            rows={4}
            className="composer-textarea"
            autoFocus
          />

          {/* Media Previews Grid */}
          {images.length > 0 && (
            <div className="composer-media-previews">
              {images.map((url, idx) => (
                <div key={idx} className="media-preview-item">
                  <img src={url} alt={`preview ${idx}`} />
                  <button type="button" className="remove-preview-btn" onClick={() => handleRemoveImage(idx)}>
                    <FiX />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Image URL Input Drawer */}
          {showImageUrlInput && (
            <div className="image-url-drawer">
              <input
                type="url"
                value={imageUrlDraft}
                onChange={(e) => setImageUrlDraft(e.target.value)}
                placeholder="Paste image URL here..."
                className="search-input-field"
              />
              <button type="button" className="primary-btn" onClick={handleAddImageUrl}>
                Add
              </button>
              <button type="button" className="secondary-btn" onClick={() => setShowImageUrlInput(false)}>
                Cancel
              </button>
            </div>
          )}

          {/* Document Attachment Previews */}
          {attachments.length > 0 && (
            <div className="composer-doc-previews">
              {attachments.map((doc, idx) => (
                <div key={idx} className="doc-preview-item">
                  <FiFileText size={20} className="doc-icon" />
                  <div className="doc-info">
                    <span className="doc-name">{doc.name}</span>
                    <small>{doc.fileType?.toUpperCase()} · {(doc.fileSize / 1024).toFixed(0)} KB</small>
                  </div>
                  <button type="button" className="remove-doc-btn" onClick={() => handleRemoveAttachment(idx)}>
                    <FiTrash2 />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Attachment Toolbars */}
          <div className="composer-actions-toolbar">
            <div className="attachment-tools">
              <button
                type="button"
                className="tool-btn"
                onClick={() => setShowImageUrlInput((prev) => !prev)}
                title="Add Image URL"
              >
                <FiImage /> <span>Image</span>
              </button>

              <button
                type="button"
                className="tool-btn"
                onClick={() => docInputRef.current?.click()}
                title="Attach Document (PDF, DOC, DOCX)"
              >
                <FiFileText /> <span>Document</span>
              </button>

              <input
                ref={docInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
                multiple
              />

              <button
                type="button"
                className="tool-btn"
                onClick={() => handleAddHashtag('#NovaSocial')}
                title="Add #NovaSocial hashtag"
              >
                <FiHash /> <span>#NovaSocial</span>
              </button>
            </div>

            <button type="submit" className="primary-btn publish-btn" disabled={publishing} aria-busy={publishing}>
              {publishing ? <><LoadingSpinner size={14} className="white" /> Publishing...</> : 'Publish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
