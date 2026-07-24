export default function ConversationListSkeleton() {
  return (
    <div className="conversation-list-skeleton">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="skeleton-row" style={{ padding: '12px 14px' }}>
          <div className="skeleton-avatar" />
          <div className="skeleton-stack">
            <div className="skeleton-line" style={{ width: '60%' }} />
            <div className="skeleton-line short" />
          </div>
        </div>
      ))}
    </div>
  );
}
