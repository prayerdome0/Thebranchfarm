export default function WorkspaceLoading() {
  return (
    <div className="loading-state" style={{ minHeight: "60vh" }}>
      <span className="loader" aria-hidden />
      <span>Loading workspace…</span>
    </div>
  );
}
