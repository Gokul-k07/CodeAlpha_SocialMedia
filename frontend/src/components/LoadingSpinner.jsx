export default function LoadingSpinner({ label = 'Loading', size = 16, className = '' }) {
  return (
    <span className={`loading-spinner ${className}`.trim()} role="status" aria-label={label} style={{ width: size, height: size }} /> 
  );
}
