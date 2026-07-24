import { useState } from 'react';
import { FiX, FiEdit3 } from 'react-icons/fi';
import api from '../services/api';
import { useToast } from './ToastProvider';
import LoadingSpinner from './LoadingSpinner';

export default function EditPostModal({ post, isOpen, onClose, onPostUpdated }) {
  const [caption, setCaption] = useState(post?.caption || '');
  const [visibility, setVisibility] = useState(post?.visibility || 'anyone');
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  if (!isOpen || !post) return null;

  // Calculate remaining time in the 3-hour edit window
  const postAgeMs = Date.now() - new Date(post.createdAt).getTime();
  const maxAgeMs = 3 * 60 * 60 * 1000;
  const isEditable = postAgeMs <= maxAgeMs;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEditable) {
      addToast('Edit window has expired. Posts can only be edited within 3 hours of creation.', 'error');
      return;
    }

    if (saving) return;
    setSaving(true);

    try {
      const res = await api.put(`/posts/${post._id}`, {
        caption: caption.trim(),
        visibility,
      });

      addToast('Post updated successfully', 'success');
      if (onPostUpdated && res.data.post) {
        onPostUpdated(res.data.post);
      }
      onClose();
    } catch (err) {
      addToast(err.response?.data?.message || 'Unable to update post.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="composer-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiEdit3 style={{ color: '#6366f1' }} /> Edit Post
          </h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close edit modal">
            <FiX />
          </button>
        </div>

        {!isEditable ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: '#ef4444' }}>
            <strong>Edit window expired</strong>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Posts can only be edited within 3 hours of publishing.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="composer-modal-form">
            <div className="form-group">
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Visibility</label>
              <div className="visibility-selector">
                <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                  <option value="anyone">🌐 Anyone</option>
                  <option value="followers">🔒 Only followers</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Caption</label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={4}
                className="composer-textarea"
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <button type="button" className="secondary-btn" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="primary-btn" disabled={saving} aria-busy={saving}>
                {saving ? (
                  <>
                    <LoadingSpinner size={14} className="white" /> Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
