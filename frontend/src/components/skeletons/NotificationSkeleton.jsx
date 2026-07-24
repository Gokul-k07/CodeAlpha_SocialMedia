export default function NotificationSkeleton() {
  return (
    <div className="notification-skeleton">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="skeleton-row">
          <div className="skeleton-avatar" />
          <div className="skeleton-stack">
            <div className="skeleton-line" style={{ width: '80%' }} />
            <div className="skeleton-line short" />
          </div>
        </div>
      ))}
    </div>
  );
}
