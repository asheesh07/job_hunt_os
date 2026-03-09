import { useState, useEffect } from 'react'
import { Zap, FileText, Search, Mail, MessageSquare, TrendingUp, Radio, Bot } from 'lucide-react'

const AGENTS = [
  { id: 'resume',    icon: FileText,      label: 'Resume',    color: '#7c3aed', desc: 'ATS scoring & tailoring' },
  { id: 'research',  icon: Search,        label: 'Research',  color: '#2563eb', desc: 'Company intelligence' },
  { id: 'outreach',  icon: Mail,          label: 'Outreach',  color: '#059669', desc: 'Cold email & LinkedIn' },
  { id: 'interview', icon: MessageSquare, label: 'Interview', color: '#d97706', desc: 'Question prep & answers' },
  { id: 'skill_gap', icon: TrendingUp,    label: 'Skill Gap', color: '#dc2626', desc: 'Career roadmap' },
  { id: 'job_scout', icon: Radio,         label: 'Job Scout', color: '#0891b2', desc: 'Daily job digest' },
]

const STATUS_COLORS = {
  Bookmarked: '#475569', Applied: '#2563eb',
  Interview: '#d97706', Offer: '#059669', Rejected: '#dc2626',
}

export default function Dashboard() {
  const [apps, setApps] = useState([])
  const [logs, setLogs] = useState([])

  useEffect(() => {
    fetch('/api/applications').then(r => r.json()).then(setApps).catch(() => {})
    fetch('/api/logs').then(r => r.json()).then(setLogs).catch(() => {})
  }, [])

  const statusCounts = apps.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1; return acc
  }, {})

  const agentCounts = logs.reduce((acc, l) => {
    acc[l.agent] = (acc[l.agent] || 0) + 1; return acc
  }, {})

  const recentLogs = [...logs].sort((a, b) =>
    new Date(b.timestamp) - new Date(a.timestamp)
  ).slice(0, 6)

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 11,
          color: 'var(--accent2)', letterSpacing: '0.15em',
          textTransform: 'uppercase', marginBottom: 8,
        }}>
          ◆ System Status
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Job Hunt OS
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 6 }}>
          {apps.length} applications · {logs.length} agent runs · {Object.keys(statusCounts).length} stages active
        </p>
      </div>

      {/* Pipeline Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 12, marginBottom: 32,
      }}>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="card" style={{ textAlign: 'center', padding: '16px 12px' }}>
            <div style={{
              fontSize: 28, fontWeight: 700,
              fontFamily: 'var(--mono)', color,
            }}>
              {statusCounts[status] || 0}
            </div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 10,
              color: 'var(--text3)', letterSpacing: '0.1em',
              textTransform: 'uppercase', marginTop: 4,
            }}>
              {status}
            </div>
          </div>
        ))}
      </div>

      {/* Agents grid */}
      <div style={{ marginBottom: 32 }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 11,
          color: 'var(--text3)', letterSpacing: '0.12em',
          textTransform: 'uppercase', marginBottom: 16,
        }}>
          Active Agents
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
        }}>
          {AGENTS.map(({ id, icon: Icon, label, color, desc }) => (
            <div key={id} className="card" style={{
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 8,
                background: color + '22',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={18} color={color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
                <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 2 }}>{desc}</div>
              </div>
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 13,
                fontWeight: 700, color,
              }}>
                {agentCounts[id] || 0}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 11,
          color: 'var(--text3)', letterSpacing: '0.12em',
          textTransform: 'uppercase', marginBottom: 16,
        }}>
          Recent Activity
        </div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {recentLogs.length === 0 ? (
            <div style={{
              padding: 32, textAlign: 'center',
              color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 13,
            }}>
              No activity yet. Run an agent to get started.
            </div>
          ) : recentLogs.map((log, i) => (
            <div key={log.id} style={{
              display: 'flex', alignItems: 'center',
              padding: '12px 20px',
              borderBottom: i < recentLogs.length - 1 ? '1px solid var(--border)' : 'none',
              gap: 12,
            }}>
              <div className="pulse-dot" style={{
                background: log.rating >= 4 ? 'var(--green)' :
                            log.rating <= 2 ? 'var(--red)' : 'var(--yellow)',
                animationDuration: '3s',
              }} />
              <span className="tag tag-purple" style={{ flexShrink: 0 }}>{log.agent}</span>
              <span style={{
                flex: 1, fontSize: 13, color: 'var(--text2)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {JSON.stringify(log.input).slice(0, 80)}
              </span>
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', flexShrink: 0,
              }}>
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              {log.rating && (
                <span style={{ color: 'var(--yellow)', fontSize: 12, flexShrink: 0 }}>
                  {'★'.repeat(log.rating)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}