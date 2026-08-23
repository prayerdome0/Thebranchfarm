export default function StoreLoading() {
  return (
    <div className="loading-state" style={{ minHeight: "60vh" }}>
      <span className="loader" aria-hidden />
      <span>Loading…</span>
    </div>
  );
}
