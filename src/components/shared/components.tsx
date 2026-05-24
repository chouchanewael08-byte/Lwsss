// ── Shared UI Components ──────────────────────────────────────

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, border: '2px solid rgba(139,92,246,0.3)', borderTop: '2px solid #8B5CF6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
  );
}

export function PageLoader({ text = 'جار التحميل...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <Spinner size={32} />
      <p style={{ color: 'var(--text2)', fontSize: 13 }}>{text}</p>
    </div>
  );
}

export function EmptyState({ icon = '📭', text, sub }: { icon?: string; text: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 p-8" style={{ color: 'var(--text2)' }}>
      <div style={{ fontSize: 48 }}>{icon}</div>
      <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 15 }}>{text}</div>
      {sub && <div style={{ fontSize: 13, textAlign: 'center' }}>{sub}</div>}
    </div>
  );
}

export function StatBox({ icon, label, value, color = 'var(--purple)' }: { icon: string; label: string; value: any; color?: string }) {
  return (
    <div className="stat-box">
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 10, paddingRight: 2 }}>{children}</div>;
}

export function Tag({ children, color = 'purple' }: { children: React.ReactNode; color?: string }) {
  return <span className={`badge badge-${color}`}>{children}</span>;
}
