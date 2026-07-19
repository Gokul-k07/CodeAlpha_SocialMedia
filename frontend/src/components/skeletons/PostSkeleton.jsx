export default function PostSkeleton() {
  return (
    <div className="card skeleton-card">
      <div className="skeleton-row">
        <div className="skeleton-avatar" />
        <div className="skeleton-stack">
          <div className="skeleton-line short" />
          <div className="skeleton-line" />
        </div>
      </div>
      <div className="skeleton-image" />
      <div className="skeleton-line" />
      <div className="skeleton-line short" />
    </div>
  );
}
