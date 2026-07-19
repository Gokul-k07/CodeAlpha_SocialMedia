export default function UserCardSkeleton() {
  return (
    <div className="user-row spaced skeleton-card">
      <div className="skeleton-avatar" />
      <div className="skeleton-stack">
        <div className="skeleton-line short" />
        <div className="skeleton-line" />
      </div>
    </div>
  );
}
