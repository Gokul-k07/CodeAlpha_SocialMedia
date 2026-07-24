export default function MessageSkeleton() {
  return (
    <div className="message-skeleton-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      <div className="skeleton-row" style={{ justifyContent: 'flex-start' }}>
        <div className="skeleton-line" style={{ width: '45%', height: '40px', borderRadius: '16px' }} />
      </div>
      <div className="skeleton-row" style={{ justifyContent: 'flex-end' }}>
        <div className="skeleton-line" style={{ width: '55%', height: '40px', borderRadius: '16px' }} />
      </div>
      <div className="skeleton-row" style={{ justifyContent: 'flex-start' }}>
        <div className="skeleton-line" style={{ width: '35%', height: '40px', borderRadius: '16px' }} />
      </div>
    </div>
  );
}
