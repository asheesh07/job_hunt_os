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

const COMPANY_TYPES = [
  '', 'AI startup', 'B2B SaaS', 'Enterprise', 'Consulting',
  'Research lab', 'YC-backed', 'Series A', 'Series B+',
]

const OUTREACH_METHODS = [
  '', 'cold_email', 'linkedin', 'referral', 'job_board', 'founder_outreach', 'coffee_chat',
]

const EMPTY_FORM = {
  company: '', role: '', status: 'Bookmarked',
  job_url: '', notes: '', location: '', salary: '',
  company_type: '', outreach_method: '', outreach_id: '',
}

export default function ApplicationTracker() {
  const [apps, setApps]         = useState([])
  const [summary, setSummary]   = useState({})
  const [adding, setAdding]     = useState(false)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [loggingOutcome, setLoggingOutcome] = useState({})

  useEffect(() => { loadApps() }, [])

  async function loadApps() {
    // Use loop endpoint — returns { applications, status_counts, response_rate_pct }
    const data = await fetch('/api/loop/applications')
      .then(r => r.json())
      .catch(() => ({ applications: [], status_counts: {} }))

    if (Array.isArray(data)) {
      // fallback if old endpoint
      setApps(data)
    } else {
      setApps(data.applications || [])
      setSummary({
        status_counts: data.status_counts || {},
        response_rate_pct: data.response_rate_pct || 0,
        total: data.total || 0,
      })
    }
  }

  async function addApp() {
    if (!form.company || !form.role) return
    await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setForm(EMPTY_FORM)
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

  // Calls POST /api/loop/outcome — triggers full learning cycle
  async function logOutcome(appId, outcome) {
    setLoggingOutcome(prev => ({ ...prev, [appId]: outcome }))
    try {
      await fetch('/api/loop/outcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: appId, outcome }),
      })
      loadApps()
    } catch (e) {
      console.error('Failed to log outcome', e)
    } finally {
      setLoggingOutcome(prev => { const n = { ...prev }; delete n[appId]; return n })
    }
  }

  const byStatus = STATUSES.reduce((acc, s) => {
    acc[s] = apps.filter(a => a.status === s)
    return acc
  }, {})

  const totalApps   = summary.total || apps.length
  const inInterview = byStatus['Interview']?.length || 0
  const responseRate = summary.response_rate_pct || 0

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 28,
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 11,
            color: 'var(--accent2)', letterSpacing: '0.15em',
            textTransform: 'uppercase', marginBottom: 8,
          }}>
            ◆ Pipeline
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Applications</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 4 }}>
            {totalApps} total · {inInterview} in interview
            {responseRate > 0 && ` · ${Math.round(responseRate)}% response rate`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>
          <Plus size={12} /> Add Application
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 11,
            color: 'var(--accent2)', letterSpacing: '0.1em',
            textTransform: 'uppercase', marginBottom: 16,
          }}>
            New Application
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Company *</label>
              <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Sarvam.ai" />
            </div>
            <div className="form-group">
              <label>Role *</label>
              <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="AI Engineer" />
            </div>
            <div className="form-group">
              <label>Company type</label>
              <select value={form.company_type} onChange={e => setForm(f => ({ ...f, company_type: e.target.value }))}>
                {COMPANY_TYPES.map(t => <option key={t} value={t}>{t || '— select —'}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>How you reached out</label>
              <select value={form.outreach_method} onChange={e => setForm(f => ({ ...f, outreach_method: e.target.value }))}>
                {OUTREACH_METHODS.map(m => <option key={m} value={m}>{m || '— select —'}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Location</label>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Bengaluru" />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Job URL</label>
              <input value={form.job_url} onChange={e => setForm(f => ({ ...f, job_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="form-group">
              <label>Salary</label>
              <input value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} placeholder="12–18 LPA" />
            </div>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Referral contact, deadline, anything relevant..."
              style={{ minHeight: 70 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={addApp}>Save</button>
            <button className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Kanban */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 14, overflowX: 'auto',
      }}>
        {STATUSES.map(status => (
          <div key={status}>
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12, padding: '8px 12px',
              background: STATUS_BG[status], borderRadius: 6,
            }}>
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
                color: STATUS_COLORS[status], letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>
                {status}
              </span>
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 12,
                fontWeight: 700, color: STATUS_COLORS[status],
              }}>
                {byStatus[status]?.length || 0}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 100 }}>
              {(byStatus[status] || []).map(app => (
                <AppCard
                  key={app.id}
                  app={app}
                  onMove={moveApp}
                  onDelete={deleteApp}
                  onLogOutcome={logOutcome}
                  loggingOutcome={loggingOutcome[app.id]}
                  statuses={STATUSES}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AppCard({ app, onMove, onDelete, onLogOutcome, loggingOutcome, statuses }) {
  const [open, setOpen] = useState(false)

  const daysAgo = app.created_at
    ? Math.floor((Date.now() - new Date(app.created_at)) / 86400000)
    : null

  // Show outcome buttons only for Applied status
  const showOutcomeLogger = app.status === 'Applied'

  return (
    <div
      className="card"
      style={{ padding: 14, cursor: 'pointer', opacity: loggingOutcome ? 0.5 : 1, transition: 'opacity 0.2s' }}
      onClick={() => setOpen(o => !o)}
    >
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>
        {app.company}
      </div>
      <div style={{ color: 'var(--text2)', fontSize: 12, marginBottom: 6 }}>
        {app.role}
      </div>

      {/* Meta pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
        {app.company_type && (
          <span style={{
            fontSize: 10, padding: '2px 6px', borderRadius: 3,
            background: 'rgba(139,92,246,0.15)', color: 'var(--accent)',
            fontFamily: 'var(--mono)',
          }}>
            {app.company_type}
          </span>
        )}
        {app.outreach_method && (
          <span style={{
            fontSize: 10, padding: '2px 6px', borderRadius: 3,
            background: 'rgba(8,145,178,0.15)', color: '#0891b2',
            fontFamily: 'var(--mono)',
          }}>
            {app.outreach_method}
          </span>
        )}
        {daysAgo !== null && (
          <span style={{
            fontSize: 10, color: 'var(--text3)',
            fontFamily: 'var(--mono)',
          }}>
            {daysAgo}d ago
          </span>
        )}
      </div>

      {app.location && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          color: 'var(--text3)', fontSize: 11, marginBottom: 3,
        }}>
          <MapPin size={10} /> {app.location}
        </div>
      )}
      {app.salary && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          color: 'var(--text3)', fontSize: 11,
        }}>
          <DollarSign size={10} /> {app.salary}
        </div>
      )}

      {/* Inline outcome logger — only on Applied cards */}
      {showOutcomeLogger && (
        <div
          style={{ display: 'flex', gap: 6, marginTop: 10 }}
          onClick={e => e.stopPropagation()}
        >
          <button
            disabled={!!loggingOutcome}
            onClick={() => onLogOutcome(app.id, 'responded')}
            style={{
              flex: 1, fontSize: 10, padding: '4px 0',
              borderRadius: 4, cursor: 'pointer',
              border: '1px solid rgba(5,150,105,0.4)',
              background: 'rgba(5,150,105,0.1)',
              color: 'var(--green)', fontFamily: 'var(--mono)',
              fontWeight: 600,
            }}
          >
            Responded
          </button>
          <button
            disabled={!!loggingOutcome}
            onClick={() => onLogOutcome(app.id, 'rejected')}
            style={{
              flex: 1, fontSize: 10, padding: '4px 0',
              borderRadius: 4, cursor: 'pointer',
              border: '1px solid rgba(220,38,38,0.4)',
              background: 'rgba(220,38,38,0.1)',
              color: 'var(--red)', fontFamily: 'var(--mono)',
              fontWeight: 600,
            }}
          >
            Rejected
          </button>
        </div>
      )}

      {/* Expanded detail */}
      {open && (
        <div
          style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}
          onClick={e => e.stopPropagation()}
        >
          {app.notes && (
            <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10, lineHeight: 1.5 }}>
              {app.notes}
            </p>
          )}

          {/* Move to status buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
            {statuses.filter(s => s !== app.status).map(s => (
              <button
                key={s}
                onClick={() => onMove(app.id, s)}
                style={{
                  background: 'var(--bg3)', border: '1px solid var(--border2)',
                  borderRadius: 3, padding: '3px 8px',
                  fontSize: 10, fontFamily: 'var(--mono)',
                  color: 'var(--text3)', cursor: 'pointer',
                }}
              >
                → {s}
              </button>
            ))}
          </div>

          {/* Mark as interview / offer via loop outcome */}
          {app.status === 'Applied' && (
            <div style={{ marginBottom: 10 }}>
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 10,
                color: 'var(--text3)', marginBottom: 6,
              }}>
                Log outcome (updates learning model):
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['interview', 'offer', 'ghosted'].map(outcome => (
                  <button
                    key={outcome}
                    onClick={() => onLogOutcome(app.id, outcome)}
                    style={{
                      fontSize: 10, padding: '3px 8px', borderRadius: 3,
                      border: '1px solid var(--border2)',
                      background: 'var(--bg3)', color: 'var(--text3)',
                      fontFamily: 'var(--mono)', cursor: 'pointer',
                    }}
                  >
                    {outcome}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {app.job_url && (
              <a
                href={app.job_url}
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--accent2)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={e => e.stopPropagation()}
              >
                <ExternalLink size={12} /> View JD
              </a>
            )}
            <button
              onClick={() => onDelete(app.id)}
              style={{
                background: 'none', border: 'none',
                cursor: 'pointer', color: 'var(--red)',
                fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}