import { useState, useEffect } from 'react'
import { Radio, Search, Bell, BellOff } from 'lucide-react'
import { PageHeader, SectionTitle, RunButton } from './ui.jsx'

export default function JobScout() {
  const [jobs, setJobs]     = useState(null)
  const [loading, setLoad]  = useState(false)
  const [email, setEmail]   = useState('')
  const [prefs, setPrefs]   = useState('')
  const [subscribed, setSub] = useState(false)
  const [subLoad, setSubLoad] = useState(false)

  useEffect(() => {
    fetch('/api/scout/status').then(r => r.json()).then(d => {
      setSub(d.subscribed); setEmail(d.email || ''); setPrefs(d.preferences || '')
    }).catch(() => {})
  }, [])

  async function runScout() {
    setLoad(true); setJobs(null)
    try {
      const data = await fetch('/api/agents/job-scout', { method: 'POST' }).then(r => r.json())
      setJobs(data)
    } finally { setLoad(false) }
  }

  async function subscribe() {
    setSubLoad(true)
    try {
      await fetch('/api/scout/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, preferences: prefs }),
      })
      setSub(true)
    } finally { setSubLoad(false) }
  }

  async function unsubscribe() {
    const status = await fetch('/api/scout/status').then(r => r.json())
    if (status.unsubscribe_token) {
      await fetch(`/api/scout/unsubscribe?token=${status.unsubscribe_token}`)
      setSub(false)
    }
  }

  const matchColor = s => s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--yellow)' : 'var(--text3)'

  return (
    <div className="fade-in">
      <PageHeader tag="Job Scout Agent" title="Job Scout" desc="Find job openings and subscribe to daily email digest" />

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Manual search */}
          <div className="card">
            <SectionTitle>Search Now</SectionTitle>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>Uses your profile preferences. Searches web for current openings.</p>
            <RunButton loading={loading} onClick={runScout}>
              <Search size={12} /> Find Jobs
            </RunButton>
          </div>

          {/* Daily digest subscription */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <SectionTitle>Daily Email Digest</SectionTitle>
              {subscribed && <div className="pulse-dot" />}
            </div>
            {subscribed ? (
              <div>
                <div style={{ fontSize: 12, color: 'var(--green)', marginBottom: 12 }}>
                  ✓ Subscribed — digest sent at 8:00 AM daily
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>Sending to: {email}</div>
                <button className="btn btn-danger" onClick={unsubscribe} style={{ fontSize: 11 }}>
                  <BellOff size={12} /> Unsubscribe
                </button>
              </div>
            ) : (
              <div>
                <div className="form-group">
                  <label>Email</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@gmail.com" />
                </div>
                <div className="form-group">
                  <label>Preferences (optional)</label>
                  <textarea value={prefs} onChange={e => setPrefs(e.target.value)} placeholder="AI roles, Bengaluru/remote, 10+ LPA..." style={{ minHeight: 60 }} />
                </div>
                <button className="btn btn-primary" onClick={subscribe} disabled={subLoad || !email}>
                  <Bell size={12} /> {subLoad ? 'Subscribing...' : 'Subscribe'}
                </button>
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>Daily digest at 8:00 AM. Unsubscribe anytime.</p>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div>
          {jobs ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <SectionTitle>Found {jobs.total_found || jobs.jobs?.length || 0} Jobs</SectionTitle>
                {jobs.top_pick && <span className="tag tag-green">Top Pick: {jobs.top_pick}</span>}
              </div>
              {jobs.search_summary && (
                <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>{jobs.search_summary}</p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(jobs.jobs || []).map((job, i) => (
                  <div key={i} className="card" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{job.title}</div>
                      <div style={{ color: 'var(--accent2)', fontSize: 13, marginTop: 2 }}>{job.company}</div>
                      <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 4 }}>{job.location} · {job.type} · {job.posted}</div>
                      <div style={{ color: 'var(--text2)', fontSize: 12, marginTop: 6 }}>{job.why_good_fit}</div>
                      {job.required_skills?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                          {job.required_skills.slice(0, 5).map((s, j) => <span key={j} className="tag tag-blue">{s}</span>)}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 800, color: matchColor(job.match_score) }}>
                        {job.match_score}%
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)' }}>match</div>
                      {job.apply_url && (
                        <a href={job.apply_url} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: 8, fontSize: 11, color: 'var(--accent2)' }}>
                          Apply →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              <Radio size={32} style={{ color: 'var(--text3)', margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--text3)', fontSize: 13 }}>Click "Find Jobs" to search for current openings</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}