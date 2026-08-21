export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <span className="loader" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
