import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import NotificationSkeleton from './skeletons/NotificationSkeleton';

function formatRelativeTime(dateString) {
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
};

function NotificationItem({ notification, onClick }) {
  const { markAsRead } = useNotifications();

  const getNotificationLink = () => {
    switch (notification.type) {
      case 'follow':
        return `/profile/${notification.sender.username}`;
      case 'like':
      case 'comment':
        return `/post/${notification.post._id}`;
      default:
        return '/';
    }
  };

  const getNotificationText = () => {
    switch (notification.type) {
      case 'follow':
        return 'started following you.';
      case 'like':
        return `liked your post: "${notification.post.caption.substring(0, 20)}..."`;
      case 'comment':
        return `commented on your post: "${notification.post.caption.substring(0, 20)}..."`;
      default:
        return 'New notification';
    }
  };

  const handleClick = () => {
    if (!notification.read) {
      markAsRead(notification._id);
    }
    onClick(); // Close dropdown
  };

  return (
    <Link to={getNotificationLink()} className={`notification-item ${notification.read ? '' : 'unread'}`} onClick={handleClick}>
      <img src={notification.sender.avatar} alt="sender avatar" className="avatar" />
      <div className="notification-content">
        <p>
          <strong>{notification.sender.fullname}</strong> {getNotificationText()}
        </p>
        <small>{formatRelativeTime(notification.createdAt)}</small>
      </div>
    </Link>
  );
}

export default function NotificationsDropdown({ open, onClose }) {
  const { notifications, loading, fetchNotifications, markAllAsRead } = useNotifications();

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  if (!open) return null;

  return (
    <div className="notification-dropdown">
      <div className="notification-header">
        <h3>Notifications</h3>
        <button onClick={markAllAsRead} disabled={loading}>Mark all as read</button>
      </div>
      <div className="notification-list">
        {loading ? (
          <NotificationSkeleton />
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <h4>No notifications yet</h4>
            <p>Interactions with your profile and posts will appear here.</p>
          </div>
        ) : (
          notifications.map(n => <NotificationItem key={n._id} notification={n} onClick={onClose} />)
        )}
      </div>
    </div>
  );
}
