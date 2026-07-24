import { useState, useRef } from 'react';
import { FiX, FiImage, FiFileText, FiUser, FiGrid, FiUpload } from 'react-icons/fi';
import api from '../services/api';
import { useToast } from './ToastProvider';

export default function MessageAttachmentModal({
  isOpen,
  onClose,
  onAddImage,
  onAddDocument,
  onShareProfile,
  onSharePost,
  onAddHashtag,
}) {
  const [activeTab, setActiveTab] = useState('menu'); // 'menu' | 'images' | 'docs' | 'profiles' | 'posts'
  const [imageUrlDraft, setImageUrlDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ users: [], posts: [] });
  const [loadingSearch, setLoadingSearch] = useState(false);

  const docInputRef = useRef(null);
  const imageFileInputRef = useRef(null);
  const { addToast } = useToast();

  if (!isOpen) return null;

  const handleDocumentUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        addToast(`File ${file.name} exceeds 5MB limit.`, 'error');
        return;
      }
      const ext = file.name.split('.').pop().toLowerCase();
      const allowed = ['pdf', 'doc', 'docx'];
      if (!allowed.includes(ext)) {
        addToast('Only PDF, DOC, and DOCX files are allowed.', 'error');
        return;
      }
      const fileUrl = URL.createObjectURL(file);
      onAddDocument({
        name: file.name,
        fileUrl,
        fileType: ext,
        fileSize: file.size,
      });
    });
    if (docInputRef.current) docInputRef.current.value = '';
    onClose();
  };

  const handleDeviceImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        addToast('Please select image files.', 'error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        addToast(`Image ${file.name} exceeds 5MB limit.`, 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onAddImage(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    });
    if (imageFileInputRef.current) imageFileInputRef.current.value = '';
    onClose();
  };

  const handleAddImageUrl = (e) => {
    e.preventDefault();
    if (!imageUrlDraft.trim()) return;
    onAddImage(imageUrlDraft.trim());
    setImageUrlDraft('');
    onClose();
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults({ users: [], posts: [] });
      return;
    }
    setLoadingSearch(true);
    try {
      const res = await api.get(`/search?q=${encodeURIComponent(query)}`);
      setSearchResults({ users: res.data.users || [], posts: res.data.posts || [] });
    } catch {
      // Quiet fail
    } finally {
      setLoadingSearch(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="composer-modal-card msg-attach-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Message Attachments</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close modal">
            <FiX />
          </button>
        </div>

        {activeTab === 'menu' && (
          <div className="msg-attach-menu-grid">
            <button
              type="button"
              className="msg-attach-tile"
              onClick={() => imageFileInputRef.current?.click()}
            >
              <FiUpload size={24} style={{ color: '#818cf8' }} />
              <span>Image from Device</span>
            </button>
            <input
              ref={imageFileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleDeviceImageUpload}
              multiple
            />

            <button
              type="button"
              className="msg-attach-tile"
              onClick={() => setActiveTab('images')}
            >
              <FiImage size={24} style={{ color: '#6366f1' }} />
              <span>Image URL</span>
            </button>

            <button
              type="button"
              className="msg-attach-tile"
              onClick={() => docInputRef.current?.click()}
            >
              <FiFileText size={24} style={{ color: '#10b981' }} />
              <span>Document (PDF/DOC)</span>
            </button>
            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              style={{ display: 'none' }}
              onChange={handleDocumentUpload}
              multiple
            />

            <button
              type="button"
              className="msg-attach-tile"
              onClick={() => {
                setActiveTab('profiles');
                handleSearch('a');
              }}
            >
              <FiUser size={24} style={{ color: '#ec4899' }} />
              <span>Share Profile</span>
            </button>

            <button
              type="button"
              className="msg-attach-tile"
              onClick={() => {
                setActiveTab('posts');
                handleSearch('a');
              }}
            >
              <FiGrid size={24} style={{ color: '#f59e0b' }} />
              <span>Share Post</span>
            </button>
          </div>
        )}

        {activeTab === 'images' && (
          <form onSubmit={handleAddImageUrl} className="composer-modal-form">
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Enter image URL to attach:</p>
            <input
              type="url"
              value={imageUrlDraft}
              onChange={(e) => setImageUrlDraft(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="composer-textarea"
              style={{ height: '46px' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" className="secondary-btn" onClick={() => setActiveTab('menu')}>Back</button>
              <button type="submit" className="primary-btn">Add Image</button>
            </div>
          </form>
        )}

        {(activeTab === 'profiles' || activeTab === 'posts') && (
          <div className="composer-modal-form">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={activeTab === 'profiles' ? 'Search user profile...' : 'Search post by #hashtag or keyword...'}
              className="composer-textarea"
              style={{ height: '44px' }}
              autoFocus
            />

            {loadingSearch ? (
              <p style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>Searching...</p>
            ) : activeTab === 'profiles' ? (
              <div className="search-results-picker">
                {searchResults.users?.length ? (
                  searchResults.users.map((u) => (
                    <div
                      key={u._id}
                      className="picker-row"
                      onClick={() => {
                        onShareProfile(u);
                        onClose();
                      }}
                    >
                      <img src={u.avatar} alt="avatar" className="avatar" style={{ width: 36, height: 36 }} />
                      <div>
                        <strong>{u.fullname}</strong>
                        <small style={{ display: 'block', color: 'var(--text-muted)' }}>@{u.username}</small>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>No user profiles found.</p>
                )}
              </div>
            ) : (
              <div className="search-results-picker">
                {searchResults.posts?.length ? (
                  searchResults.posts.map((p) => (
                    <div
                      key={p._id}
                      className="picker-row"
                      onClick={() => {
                        onSharePost(p);
                        onClose();
                      }}
                    >
                      <div className="post-picker-meta">
                        <strong>{p.author?.fullname || 'Creator'}</strong>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.84rem', color: 'var(--text-muted)' }}>{p.caption?.substring(0, 45)}...</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>No posts found.</p>
                )}
              </div>
            )}

            <button type="button" className="secondary-btn" onClick={() => setActiveTab('menu')}>Back</button>
          </div>
        )}
      </div>
    </div>
  );
}
