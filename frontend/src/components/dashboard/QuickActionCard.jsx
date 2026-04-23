/**
 * Compact action tile for dashboard Quick Actions (shared qa-btn / qa-grid styles).
 */
export default function QuickActionCard({ cls, icon, label, onClick }) {
  return (
    <button type="button" className={`qa-btn ${cls}`} onClick={onClick}>
      <div className="qa-icon">{icon}</div>
      <span>{label}</span>
    </button>
  );
}
