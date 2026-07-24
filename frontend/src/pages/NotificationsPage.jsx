import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiBell, FiCheckCircle } from 'react-icons/fi';
import { useNotifications } from '../context/NotificationContext';
import NotificationSkeleton from '../components/skeletons/NotificationSkeleton';

function formatRelativeTime(dateString) {
  if (!dateString) return 'Just now';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.round((now - date) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function NotificationCard({ notification }) {
  const { markAsRead } = useNotifications();

  const getNotificationLink = () => {
    switch (notification.type) {
      case 'follow':
        return `/profile/${notification.sender?.username}`;
      case 'like':
      case 'comment':
        return `/post/${notification.post?._id || notification.post}`;
      default:
        return '/';
    }
  };

  const getNotificationText = () => {
    switch (notification.type) {
      case 'follow':
        return 'started following you.';
      case 'like':
        return `liked your post: "${(notification.post?.caption || '').substring(0, 30)}..."`;
      case 'comment':
        return `commented on your post: "${(notification.post?.caption || '').substring(0, 30)}..."`;
      case 'mention':
        return `mentioned you in a post: "${(notification.post?.caption || '').substring(0, 30)}..."`;
      default:
        return 'interacted with your profile.';
    }
  };

  const handleClick = () => {
    if (!notification.read) {
      markAsRead(notification._id);
    }
  };

  return (
    <Link
      to={getNotificationLink()}
      className={`notification-page-card ${notification.read ? '' : 'unread'}`}
      onClick={handleClick}
    >
      <img src={notification.sender?.avatar} alt="avatar" className="avatar" />
      <div className="notification-card-content">
        <p>
          <strong>{notification.sender?.fullname || 'Someone'}</strong> {getNotificationText()}
        </p>
        <span className="notification-time">{formatRelativeTime(notification.createdAt)}</span>
      </div>
      {!notification.read && <span className="unread-pulse-dot" title="Unread" />}
    </Link>
  );
}

export default function NotificationsPage() {
  const { notifications, loading, fetchNotifications, markAllAsRead, unreadCount } = useNotifications();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <div className="notifications-page-container">
      <div className="notifications-sticky-header">
        <div className="header-title-row">
          <h2>
            <FiBell className="bell-icon" /> Notifications
            {unreadCount > 0 && <span className="header-count-badge">{unreadCount}</span>}
          </h2>
          <button
            type="button"
            className="mark-all-btn"
            onClick={markAllAsRead}
            disabled={loading || unreadCount === 0}
          >
            <FiCheckCircle /> Mark all as read
          </button>
        </div>
      </div>

      <div className="notifications-content-list">
        {loading ? (
          <NotificationSkeleton />
        ) : notifications.length === 0 ? (
          <div className="page-card notifications-empty-state">
            <FiBell size={48} className="empty-bell-icon" />
            <h3>No notifications yet</h3>
            <p>When people follow you, like your posts, or leave comments, you'll see them here.</p>
          </div>
        ) : (
          notifications.map((n) => <NotificationCard key={n._id} notification={n} />)
        )}
      </div>
    </div>
  );
}
