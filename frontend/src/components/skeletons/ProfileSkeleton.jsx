export default function ProfileSkeleton() {
  return (
    <div className="page-card profile-card skeleton-card">
      <div className="skeleton-cover" />
      <div className="skeleton-row">
        <div className="skeleton-avatar large" />
        <div className="skeleton-stack">
          <div className="skeleton-line short" />
          <div className="skeleton-line" />
        </div>
      </div>
      <div className="skeleton-line" />
      <div className="skeleton-line short" />
      <div className="skeleton-stats" />
    </div>
  );
}
