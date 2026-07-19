import UserCardSkeleton from './UserCardSkeleton';

export default function SearchResultSkeleton() {
  return (
    <div className="results-list">
      <UserCardSkeleton />
      <UserCardSkeleton />
      <UserCardSkeleton />
    </div>
  );
}
