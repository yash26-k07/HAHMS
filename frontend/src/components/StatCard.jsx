export function StatCard({ label, value, icon }) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

export function StatusBadge({ status }) {
  return <span className={`badge status-${status}`}>{status.replace(/_/g, ' ')}</span>;
}
