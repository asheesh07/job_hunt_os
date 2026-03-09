// src/components/ui.jsx — shared helpers

export function PageHeader({ icon: Icon, tag, title, desc }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent2)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
        ◆ {tag}
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>{title}</h1>
      {desc && <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 4 }}>{desc}</p>}
    </div>
  )
}

export function SectionTitle({ children }) {
  return (
    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
      {children}
    </div>
  )
}

export function RunButton({ loading, onClick, disabled, children }) {
  return (
    <button className="btn btn-primary" onClick={onClick} disabled={loading || disabled}>
      {loading ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Running...</> : children}
    </button>
  )
}

export function JsonBlock({ data }) {
  return (
    <pre style={{
      fontSize: 12, color: 'var(--text2)',
      background: 'var(--bg3)', border: '1px solid var(--border)',
      borderRadius: 6, padding: 16,
      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      maxHeight: 500, overflowY: 'auto',
      fontFamily: 'var(--mono)',
    }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}