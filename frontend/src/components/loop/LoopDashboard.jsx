import { useState, useEffect, useCallback } from 'react'

// ── Agent badge colors matching existing CSS vars ──────────────────────────
const AGENT_META = {
  profile_intelligence: { label: 'Agent 1', color: '#7c3aed', dot: '#7c3aed' },
  opportunity_scorer:   { label: 'Agent 2', color: '#d97706', dot: '#d97706' },
  outreach_engine:      { label: 'Agent 3', color: '#059669', dot: '#059669' },
  feedback_loop:        { label: 'Agent 4', color: '#0891b2', dot: '#0891b2' },
  // fallbacks for legacy agent names
  resume:               { label: 'Resume',   color: '#7c3aed', dot: '#7c3aed' },
  research:             { label: 'Research', color: '#2563eb', dot: '#2563eb' },
  outreach:             { label: 'Outreach', color: '#059669', dot: '#059669' },
  skill_gap:            { label: 'Skill Gap',color: '#dc2626', dot: '#dc2626' },
  job_scout:            { label: 'Scout',    color: '#0891b2', dot: '#0891b2' },
}

// ── Format raw agent log into human-readable action sentence ──────────────
function formatAgentAction(log) {
  const agent = log.agent || ''
  const inputs = log.inputs || {}

  if (agent === 'profile_intelligence' || agent.includes('profile')) {
    const outcome = inputs.outcome || ''
    const appId = inputs.application_id || ''
    return {
      title: 'Profile agent updated pattern model',
      sub: `Triggered by outcome: ${outcome}${appId ? ` · app ${appId}` : ''}`,
    }
  }
  if (agent === 'opportunity_scorer' || agent.includes('scorer')) {
    const count = inputs.job_count || ''
    return {
      title: count ? `Scorer ranked ${count} opportunities` : 'Scorer deprioritized roles',
      sub: inputs.company ? `Scored: ${inputs.company}` : 'Based on historical response patterns',
    }
  }
  if (agent === 'outreach_engine' || agent.includes('outreach')) {
    const company = inputs.company || ''
    const mode = inputs.mode || ''
    return {
      title: company ? `Outreach generated for ${company}` : 'Outreach engine ran',
      sub: mode ? `Mode: ${mode}` : 'Calibrated to winning patterns',
    }
  }
  if (agent === 'feedback_loop' || agent === 'feedback_strategy') {
    return {
      title: 'Feedback agent analyzed pipeline',
      sub: inputs.app_id ? `Outcome logged: ${inputs.app_id}` : 'Strategy report updated',
    }
  }
  if (agent === 'resume') {
    return {
      title: 'Resume analyzed against job description',
      sub: inputs.jd_snippet ? inputs.jd_snippet.slice(0, 60) + '…' : 'ATS score computed',
    }
  }
  if (agent === 'research') {
    return {
      title: `Company research: ${inputs.company || 'unknown'}`,
      sub: inputs.role ? `Role: ${inputs.role}` : 'Intelligence report generated',
    }
  }
  // generic fallback
  const key = Object.keys(inputs)[0]
  return {
    title: `${agent.replace(/_/g, ' ')} ran`,
    sub: key ? `${key}: ${String(inputs[key]).slice(0, 50)}` : 'No details',
  }
}

// ── Relative time helper ──────────────────────────────────────────────────
function relativeTime(iso) {
  if (!iso) return ''
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ value, label, color }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '20px 12px' }}>
      <div style={{
        fontSize: 32, fontWeight: 700,
        fontFamily: 'var(--mono)', color, letterSpacing: '-0.02em',
      }}>
        {value}
      </div>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 10,
        color: 'var(--text3)', letterSpacing: '0.1em',
        textTransform: 'uppercase', marginTop: 6,
      }}>
        {label}
      </div>
    </div>
  )
}

function AgentFeed({ logs }) {
  const recent = [...logs]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 6)

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{
        padding: '14px 18px 10px',
        fontFamily: 'var(--mono)', fontSize: 10,
        color: 'var(--text3)', letterSpacing: '0.12em', textTransform: 'uppercase',
        borderBottom: '1px solid var(--border)',
      }}>
        Agent activity feed — what the system is doing right now
      </div>
      {recent.length === 0 ? (
        <div style={{
          padding: 28, textAlign: 'center',
          color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 12,
        }}>
          No agent activity yet. Run an agent to start the loop.
        </div>
      ) : recent.map((log, i) => {
        const meta = AGENT_META[log.agent] || { label: log.agent, color: '#7c3aed', dot: '#7c3aed' }
        const { title, sub } = formatAgentAction(log)
        return (
          <div key={log.id || i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '13px 18px',
            borderBottom: i < recent.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: meta.dot, flexShrink: 0, marginTop: 5,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>
                {title}
              </div>
              <div style={{
                fontSize: 12, color: 'var(--text3)',
                fontFamily: 'var(--mono)', lineHeight: 1.4,
              }}>
                {sub} · {relativeTime(log.created_at)}
              </div>
            </div>
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 4,
              background: meta.color + '22', color: meta.color,
              fontFamily: 'var(--mono)', fontWeight: 600,
              flexShrink: 0, whiteSpace: 'nowrap',
            }}>
              {meta.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function LoopCycle({ analytics }) {
  const stages = ['Apply', 'Track', 'Learn', 'Prioritize']
  const cycles = analytics?.loop_cycles || 0
  const weekly = analytics?.weekly_series || []
  const trend = analytics?.trend || 'flat'
  const overallRate = analytics?.overall_response_rate_pct || 0

  const maxRate = Math.max(...weekly.map(w => w.rate || 0), 1)

  return (
    <div className="card">
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 10,
        color: 'var(--text3)', letterSpacing: '0.12em', textTransform: 'uppercase',
        marginBottom: 14,
      }}>
        Loop cycle
      </div>

      {/* Stage pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
        {stages.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{
              padding: '5px 10px', borderRadius: 6,
              background: cycles > 0 ? 'rgba(167,139,250,0.15)' : 'var(--surface)',
              border: `1px solid ${cycles > 0 ? 'rgba(167,139,250,0.4)' : 'var(--border)'}`,
              color: cycles > 0 ? 'var(--accent)' : 'var(--text3)',
              fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 600,
              whiteSpace: 'nowrap',
            }}>
              {s}
            </div>
            {i < stages.length - 1 && (
              <div style={{ color: 'var(--text3)', fontSize: 11, fontFamily: 'var(--mono)' }}>→</div>
            )}
          </div>
        ))}
      </div>

      <div style={{
        fontFamily: 'var(--mono)', fontSize: 11,
        color: 'var(--text3)', marginBottom: 16,
      }}>
        cycle {cycles} · {cycles > 0 ? 'all stages complete' : 'no outcomes logged yet'}
      </div>

      {/* Rate chart label */}
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 10,
        color: 'var(--text3)', letterSpacing: '0.12em', textTransform: 'uppercase',
        marginBottom: 10,
      }}>
        Response rate over time
      </div>

      {/* Bar chart */}
      {weekly.length === 0 ? (
        <div style={{
          height: 48, display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: 'var(--text3)',
          fontFamily: 'var(--mono)', fontSize: 11,
        }}>
          No data yet
        </div>
      ) : (
        <>
          <div style={{
            display: 'flex', alignItems: 'flex-end',
            gap: 4, height: 48, marginBottom: 6,
          }}>
            {weekly.slice(-8).map((w, i, arr) => {
              const heightPct = maxRate > 0 ? (w.rate / maxRate) * 100 : 0
              const isRecent = i >= arr.length - 2
              return (
                <div
                  key={w.week}
                  title={`${w.week}: ${w.rate}%`}
                  style={{
                    flex: 1, borderRadius: '2px 2px 0 0',
                    minHeight: 3,
                    height: `${Math.max(heightPct, 6)}%`,
                    background: isRecent ? 'var(--accent)' : 'rgba(139,92,246,0.35)',
                    transition: 'height 0.4s ease',
                  }}
                />
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {weekly.slice(-8).map(w => (
              <div key={w.week} style={{
                flex: 1, textAlign: 'center',
                fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)',
              }}>
                {w.week.split('-W')[1] ? `W${w.week.split('-W')[1]}` : w.week.slice(-3)}
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{
        marginTop: 10, fontFamily: 'var(--mono)', fontSize: 11,
        color: trend === 'improving' ? 'var(--green)' :
               trend === 'declining' ? 'var(--red)' : 'var(--text3)',
      }}>
        {trend === 'improving' ? '↑' : trend === 'declining' ? '↓' : '→'} {trend} · {overallRate}%
      </div>
    </div>
  )
}

function DecisionIntelligence({ analytics }) {
  const byType = analytics?.by_company_type || {}
  const bottleneck = analytics?.bottleneck || ''

  const sorted = Object.entries(byType)
    .map(([type, data]) => ({ type, ...data }))
    .sort((a, b) => b.conversion_pct - a.conversion_pct)
    .slice(0, 4)

  function scoreColor(pct) {
    if (pct >= 50) return 'var(--green)'
    if (pct >= 25) return '#d97706'
    return 'var(--red)'
  }

  function actionLabel(pct) {
    if (pct >= 50) return 'High callback'
    if (pct >= 25) return 'Med — tailor first'
    return 'Skip / deprioritize'
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{
        padding: '14px 18px 10px',
        fontFamily: 'var(--mono)', fontSize: 10,
        color: 'var(--text3)', letterSpacing: '0.12em', textTransform: 'uppercase',
        borderBottom: '1px solid var(--border)',
      }}>
        Decision intelligence — why these were scored high
      </div>

      {sorted.length === 0 ? (
        <div style={{
          padding: 24, color: 'var(--text3)',
          fontFamily: 'var(--mono)', fontSize: 12, textAlign: 'center',
        }}>
          Log outcomes to generate scoring intelligence
        </div>
      ) : sorted.map((item, i) => (
        <div key={item.type} style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '12px 18px',
          borderBottom: i < sorted.length - 1 ? '1px solid var(--border)' : 'none',
          opacity: item.conversion_pct < 10 ? 0.45 : 1,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>
              {item.type}
            </div>
            <div style={{
              fontSize: 11, color: 'var(--text3)',
              fontFamily: 'var(--mono)', lineHeight: 1.4,
            }}>
              {item.applied} applied · {item.responded} responded
              {item.conversion_pct < 10 ? ' · auto-deprioritized' : ''}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{
              fontSize: 20, fontWeight: 700,
              fontFamily: 'var(--mono)',
              color: scoreColor(item.conversion_pct),
            }}>
              {Math.round(item.conversion_pct)}
            </div>
            <div style={{
              fontSize: 9, fontFamily: 'var(--mono)',
              color: scoreColor(item.conversion_pct), marginTop: 1,
            }}>
              {actionLabel(item.conversion_pct)}
            </div>
          </div>
        </div>
      ))}

      {bottleneck && (
        <div style={{
          padding: '10px 18px',
          background: 'rgba(217,119,6,0.08)',
          borderTop: '1px solid var(--border)',
          fontSize: 11, color: '#d97706',
          fontFamily: 'var(--mono)', lineHeight: 1.5,
        }}>
          ! {bottleneck}
        </div>
      )}
    </div>
  )
}

function MemoryPanel({ profile }) {
  const intel = profile?.derived_intelligence || {}
  const patterns = intel.patterns_detected || []
  const byMode = profile?.outreach_patterns?.by_mode || []

  const memoryRows = [
    { key: 'best fit',     val: intel.best_company_type,    conf: 'high' },
    { key: 'best hook',    val: intel.best_hook,            conf: 'high' },
    { key: 'best project', val: intel.best_project,         conf: 'high' },
    { key: 'avoid',        val: intel.what_doesnt?.[0],     conf: 'high' },
    { key: 'bottleneck',   val: intel.conversion_bottleneck,conf: 'med'  },
    { key: 'trend',        val: intel.response_rate_trend,  conf: intel.response_rate_trend === 'improving' ? 'high' : 'med' },
  ].filter(r => r.val)

  function confColor(c) {
    if (c === 'high') return { bg: 'rgba(5,150,105,0.15)', color: 'var(--green)' }
    if (c === 'med')  return { bg: 'rgba(217,119,6,0.15)',  color: '#d97706' }
    return { bg: 'rgba(220,38,38,0.15)', color: 'var(--red)' }
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{
        padding: '14px 18px 10px',
        fontFamily: 'var(--mono)', fontSize: 10,
        color: 'var(--text3)', letterSpacing: '0.12em', textTransform: 'uppercase',
        borderBottom: '1px solid var(--border)',
      }}>
        Memory — what the system has learned
      </div>

      <div style={{ padding: '12px 18px' }}>
        {memoryRows.length === 0 ? (
          <div style={{
            color: 'var(--text3)', fontFamily: 'var(--mono)',
            fontSize: 12, textAlign: 'center', padding: '12px 0',
          }}>
            No patterns detected yet. Log 3+ outcomes to build memory.
          </div>
        ) : memoryRows.map((row, i) => {
          const { bg, color } = confColor(row.conf)
          return (
            <div key={i} style={{
              display: 'flex', gap: 8, marginBottom: 9,
              alignItems: 'flex-start', fontSize: 12,
            }}>
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 10,
                color: 'var(--text3)', width: 72, flexShrink: 0,
                paddingTop: 1,
              }}>
                {row.key}
              </div>
              <div style={{
                color: 'var(--text2)', lineHeight: 1.4, flex: 1,
              }}>
                {String(row.val).slice(0, 60)}
              </div>
              <span style={{
                fontSize: 9, padding: '2px 5px', borderRadius: 3,
                background: bg, color, fontFamily: 'var(--mono)',
                fontWeight: 600, flexShrink: 0, alignSelf: 'flex-start',
              }}>
                {row.conf}
              </span>
            </div>
          )
        })}

        {/* Experiment results */}
        {byMode.length > 0 && (
          <>
            <div style={{
              borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 12,
              fontFamily: 'var(--mono)', fontSize: 10,
              color: 'var(--text3)', letterSpacing: '0.12em', textTransform: 'uppercase',
              marginBottom: 10,
            }}>
              Experiment results
            </div>
            {byMode.slice(0, 3).map((m, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: 8,
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{m.mode}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{m.total} sent</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 80, height: 5,
                    background: 'var(--surface)', borderRadius: 3, overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      width: `${Math.min(m.response_rate_pct, 100)}%`,
                      background: 'var(--accent)',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                  <div style={{
                    fontSize: 11, fontFamily: 'var(--mono)',
                    color: 'var(--accent)', width: 32, textAlign: 'right',
                  }}>
                    {Math.round(m.response_rate_pct)}%
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function OutcomeLogger({ applications, onOutcomeLogged }) {
  const [logging, setLogging] = useState({})

  // Show pending apps — Applied status, sorted by oldest first
  const pending = [...applications]
    .filter(a => a.status === 'Applied')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(0, 4)

  async function logOutcome(appId, outcome) {
    setLogging(prev => ({ ...prev, [appId]: outcome }))
    try {
      await fetch('/api/loop/outcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: appId, outcome }),
      })
      onOutcomeLogged()
    } catch (e) {
      console.error('Failed to log outcome', e)
    } finally {
      setLogging(prev => { const n = { ...prev }; delete n[appId]; return n })
    }
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{
        padding: '14px 18px 10px',
        fontFamily: 'var(--mono)', fontSize: 10,
        color: 'var(--text3)', letterSpacing: '0.12em', textTransform: 'uppercase',
        borderBottom: '1px solid var(--border)',
      }}>
        Log an outcome
      </div>

      <div style={{ padding: '4px 0' }}>
        {pending.length === 0 ? (
          <div style={{
            padding: '20px 18px', color: 'var(--text3)',
            fontFamily: 'var(--mono)', fontSize: 12, textAlign: 'center',
          }}>
            No pending applications. Add applications to track outcomes.
          </div>
        ) : pending.map((app, i) => {
          const isLogging = !!logging[app.id]
          const daysAgo = Math.floor(
            (Date.now() - new Date(app.created_at)) / 86400000
          )
          return (
            <div key={app.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 18px',
              borderBottom: i < pending.length - 1 ? '1px solid var(--border)' : 'none',
              opacity: isLogging ? 0.5 : 1,
              transition: 'opacity 0.2s',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{app.company}</div>
                <div style={{
                  fontSize: 11, color: 'var(--text3)',
                  fontFamily: 'var(--mono)', marginTop: 1,
                }}>
                  {app.role} · applied {daysAgo}d ago
                </div>
              </div>
              <button
                disabled={isLogging}
                onClick={() => logOutcome(app.id, 'responded')}
                style={{
                  fontSize: 10, padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
                  border: '1px solid rgba(5,150,105,0.4)',
                  background: 'rgba(5,150,105,0.1)', color: 'var(--green)',
                  fontFamily: 'var(--mono)', fontWeight: 600,
                }}
              >
                Responded
              </button>
              <button
                disabled={isLogging}
                onClick={() => logOutcome(app.id, 'rejected')}
                style={{
                  fontSize: 10, padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
                  border: '1px solid rgba(220,38,38,0.4)',
                  background: 'rgba(220,38,38,0.1)', color: 'var(--red)',
                  fontFamily: 'var(--mono)', fontWeight: 600,
                }}
              >
                Rejected
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function LoopDashboard() {
  const [analytics, setAnalytics]   = useState(null)
  const [applications, setApps]     = useState([])
  const [profile, setProfile]       = useState(null)
  const [logs, setLogs]             = useState([])
  const [outreachPatterns, setPatterns] = useState(null)
  const [loading, setLoading]       = useState(true)

  const fetchAll = useCallback(async () => {
    try {
      const [analyticsRes, appsRes, profileRes, logsRes, patternsRes] = await Promise.allSettled([
        fetch('/api/loop/analytics').then(r => r.json()),
        fetch('/api/loop/applications').then(r => r.json()),
        fetch('/api/loop/profile/enriched').then(r => r.json()),
        fetch('/api/logs').then(r => r.json()),
        fetch('/api/loop/outreach/patterns').then(r => r.json()),
      ])
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value)
      if (appsRes.status === 'fulfilled') setApps(appsRes.value?.applications || appsRes.value || [])
      if (profileRes.status === 'fulfilled') {
        const p = profileRes.value
        if (patternsRes.status === 'fulfilled') p.outreach_patterns = patternsRes.value
        setProfile(p)
      }
      if (logsRes.status === 'fulfilled') setLogs(Array.isArray(logsRes.value) ? logsRes.value : [])
    } catch (e) {
      console.error('Dashboard fetch error', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const funnel = analytics?.funnel || {}
  const responseRate = analytics?.overall_response_rate_pct || 0
  const recentRate = analytics?.recent_30_day_rate_pct || 0
  const rateLift = Math.round(recentRate - responseRate)
  const cycles = analytics?.loop_cycles || 0
  const interviews = funnel.Interview || 0
  const trend = analytics?.trend || 'flat'

  // Build subtitle line
  const lastLog = logs[0]
  const lastActionAgo = lastLog ? relativeTime(lastLog.created_at) : null
  const subtitle = [
    responseRate > 0 ? `Response rate ${responseRate}%` : null,
    trend === 'improving' && recentRate > 0 ? `→ ${recentRate}% (30d)` : null,
    lastActionAgo ? `last agent action ${lastActionAgo}` : null,
  ].filter(Boolean).join(' · ')

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 300, color: 'var(--text3)',
        fontFamily: 'var(--mono)', fontSize: 12,
      }}>
        loading intelligence loop…
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 11,
          color: 'var(--accent2)', letterSpacing: '0.15em',
          textTransform: 'uppercase', marginBottom: 8,
        }}>
          ◆ Intelligence loop{cycles > 0 ? ` — cycle ${cycles}` : ''}
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Loop Dashboard
        </h1>
        {subtitle && (
          <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 6 }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Stat row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12, marginBottom: 24,
      }}>
        <StatCard value={`${Math.round(responseRate)}%`} label="Response rate"  color="var(--accent)" />
        <StatCard
          value={rateLift >= 0 ? `+${rateLift}pp` : `${rateLift}pp`}
          label="Rate lift (30d)"
          color={rateLift > 0 ? 'var(--green)' : rateLift < 0 ? 'var(--red)' : 'var(--text3)'}
        />
        <StatCard value={interviews}  label="Active interviews" color="#d97706" />
        <StatCard value={cycles}      label="Loop cycles"       color="var(--accent)" />
      </div>

      {/* Middle row — agent feed + loop cycle */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1.4fr 1fr',
        gap: 16, marginBottom: 16,
      }}>
        <AgentFeed logs={logs} />
        <LoopCycle analytics={analytics} />
      </div>

      {/* Bottom row — decision intel + memory */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 16, marginBottom: 16,
      }}>
        <DecisionIntelligence analytics={analytics} />
        <MemoryPanel profile={profile} />
      </div>

      {/* Outcome logger — full width */}
      <OutcomeLogger
        applications={applications}
        onOutcomeLogged={fetchAll}
      />
    </div>
  )
}