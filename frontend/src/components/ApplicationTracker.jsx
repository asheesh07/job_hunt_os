import { useState, useEffect } from 'react'
import { Plus, Trash2, ExternalLink, MapPin, DollarSign } from 'lucide-react'

const STATUSES = ['Bookmarked', 'Applied', 'Interview', 'Offer', 'Rejected']
const STATUS_COLORS = {
  Bookmarked: '#475569', Applied: '#2563eb',
  Interview: '#d97706', Offer: '#059669', Rejected: '#7f1d1d',
}
const STATUS_BG = {
  Bookmarked: '#1e293b', Applied: '#1e3a5f',
  Interview: '#422006', Offer: '#14532d', Rejected: '#450a0a',
}

export default function ApplicationTracker() {
  const [apps, setApps]     = useState([])
  const [adding, setAdding] = useState(false)
  const [form, setForm]     = useState({ company: '', role: '', status: 'Bookmarked', job_url: '', notes: '', location: '', salary: '' })

  useEffect(() => { loadApps() }, [])

  async function loadApps() {
    const data = await fetch('/api/applications').then(r => r.json()).catch(() => [])
    setApps(data)
  }

  async function addApp() {
    if (!form.company || !form.role) return
    await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setForm({ company: '', role: '', status: 'Bookmarked', job_url: '', notes: '', location: '', salary: '' })
    setAdding(false)
    loadApps()
  }

  async function moveApp(id, status) {
    await fetch(`/api/applications/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    loadApps()
  }

  async function deleteApp(id) {
    await fetch(`/api/applications/${id}`, { method: 'DELETE' })
    loadApps()
  }

  const byStatus = STATUSES.reduce((acc, s) => {
    acc[s] = apps.filter(a => a.status === s); return acc
  }, {})

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent2)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>◆ Pipeline</div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Application Tracker</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 4 }}>{apps.length} total · {byStatus['Interview']?.length || 0} in interview</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>
          <Plus size={12} /> Add Application
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent2)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>New Application</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group"><label>Company *</label><input value={form.company} onChange={e => setForm(f => ({...f, company: e.target.value}))} placeholder="Sarvam.ai" /></div>
            <div className="form-group"><label>Role *</label><input value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))} placeholder="AI Researcher" /></div>
            <div className="form-group"><label>Location</label><input value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} placeholder="Bengaluru" /></div>
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Job URL</label><input value={form.job_url} onChange={e => setForm(f => ({...f, job_url: e.target.value}))} placeholder="https://..." /></div>
            <div className="form-group"><label>Salary</label><input value={form.salary} onChange={e => setForm(f => ({...f, salary: e.target.value}))} placeholder="12-18 LPA" /></div>
          </div>
          <div className="form-group"><label>Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Referral from uncle at Qualcomm..." style={{ minHeight: 70 }} /></div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={addApp}>Save</button>
            <button className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Kanban columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, overflowX: 'auto' }}>
        {STATUSES.map(status => (
          <div key={status}>
            {/* Column header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 12, padding: '8px 12px',
              background: STATUS_BG[status], borderRadius: 6,
            }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: STATUS_COLORS[status], letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {status}
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: STATUS_COLORS[status] }}>
                {byStatus[status]?.length || 0}
              </span>
            </div>

            {/* Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 100 }}>
              {(byStatus[status] || []).map(app => (
                <AppCard key={app.id} app={app} onMove={moveApp} onDelete={deleteApp} statuses={STATUSES} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AppCard({ app, onMove, onDelete, statuses }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="card" style={{ padding: 14, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{app.company}</div>
      <div style={{ color: 'var(--text2)', fontSize: 12, marginBottom: 8 }}>{app.role}</div>
      {app.location && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text3)', fontSize: 11, marginBottom: 4 }}>
          <MapPin size={10} /> {app.location}
        </div>
      )}
      {app.salary && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text3)', fontSize: 11 }}>
          <DollarSign size={10} /> {app.salary}
        </div>
      )}
      {open && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }} onClick={e => e.stopPropagation()}>
          {app.notes && <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>{app.notes}</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
            {statuses.filter(s => s !== app.status).map(s => (
              <button key={s} onClick={() => onMove(app.id, s)} style={{
                background: 'var(--bg3)', border: '1px solid var(--border2)',
                borderRadius: 3, padding: '3px 8px',
                fontSize: 10, fontFamily: 'var(--mono)',
                color: 'var(--text3)', cursor: 'pointer',
              }}>→ {s}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {app.job_url && (
              <a href={app.job_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent2)', fontSize: 11 }}>
                <ExternalLink size={12} /> View JD
              </a>
            )}
            <button onClick={() => onDelete(app.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 11 }}>
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}