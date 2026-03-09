import { useState, useEffect } from 'react'
import { Bot, Star } from 'lucide-react'
import { PageHeader, SectionTitle } from './ui.jsx'

export default function FeedbackLog() {
  const [logs, setLogs]       = useState([])
  const [analysis, setAnalysis] = useState(null)
  const [agent, setAgent]     = useState('')
  const [loading, setLoad]    = useState(false)

  useEffect(() => { loadLogs() }, [agent])

  async function loadLogs() {
    const url = agent ? `/api/logs?agent=${agent}` : '/api/logs'
    const data = await fetch(url).then(r => r.json()).catch(() => [])
    setLogs([...data].reverse())
  }

  async function runAnalysis() {
    setLoad(true)
    const url = agent ? `/api/feedback?agent=${agent}` : '/api/feedback'
    const data = await fetch(url).then(r => r.json()).catch(() => ({}))
    setAnalysis(data)
    setLoad(false)
  }

  async function rate(logId, rating) {
    await fetch('/api/logs/rate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ log_id: logId, rating }),
    })
    loadLogs()
  }

  const AGENTS = ['', 'resume', 'research', 'outreach', 'interview', 'skill_gap', 'job_scout']

  return (
    <div className="fade-in">
      <PageHeader tag="Feedback Loop" title="Agent Feedback" desc="Rate agent outputs to improve future results automatically" />

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <select value={agent} onChange={e => setAgent(e.target.value)} style={{ width: 180 }}>
          {AGENTS.map(a => <option key={a} value={a}>{a || 'All Agents'}</option>)}
        </select>
        <button className="btn btn-primary" onClick={runAnalysis} disabled={loading}>
          <Bot size={12} /> {loading ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>

      {/* Analysis result */}
      {analysis && (
        <div className="card" style={{ marginBottom: 24 }}>
          <SectionTitle>Self-Improvement Analysis</SectionTitle>
          {analysis.status === 'insufficient_data' ? (
            <p style={{ fontSize: 13, color: 'var(--text3)' }}>{analysis.message}</p>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
                <Stat label="Total Runs"   value={analysis.total_runs} />
                <Stat label="Rated"        value={analysis.rated_runs} />
                <Stat label="Avg Rating"   value={analysis.avg_rating?.toFixed(1) + '★'} color="var(--yellow)" />
                <Stat label="Low Rated"    value={analysis.low_rated_count} color="var(--red)" />
              </div>
              {analysis.improvement_suggestions && (
                <div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--red)', textTransform: 'uppercase', marginBottom: 8 }}>Issues Found</div>
                  {analysis.improvement_suggestions.issues?.map((issue, i) => (
                    <div key={i} style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6, display: 'flex', gap: 8 }}>
                      <span style={{ color: 'var(--red)' }}>✗</span> {issue}
                    </div>
                  ))}
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--green)', textTransform: 'uppercase', marginTop: 12, marginBottom: 8 }}>Suggestions</div>
                  {analysis.improvement_suggestions.suggestions?.map((s, i) => (
                    <div key={i} style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6, display: 'flex', gap: 8 }}>
                      <span style={{ color: 'var(--green)' }}>→</span> {s}
                    </div>
                  ))}
                  {analysis.improvement_suggestions.improved_instruction && (
                    <div style={{ marginTop: 12, padding: 12, background: 'var(--bg3)', borderRadius: 6, borderLeft: '3px solid var(--accent)' }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent2)', marginBottom: 6 }}>PROMPT IMPROVEMENT</div>
                      <p style={{ fontSize: 13, color: 'var(--text)' }}>{analysis.improvement_suggestions.improved_instruction}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Log list */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {logs.length} runs logged
        </div>
        {logs.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No runs yet. Use an agent to see logs here.</div>
        ) : logs.map((log, i) => (
          <div key={log.id} style={{
            padding: '14px 20px',
            borderBottom: i < logs.length - 1 ? '1px solid var(--border)' : 'none',
            display: 'flex', gap: 14, alignItems: 'flex-start',
          }}>
            <span className="tag tag-purple" style={{ flexShrink: 0 }}>{log.agent}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {JSON.stringify(log.input)}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)' }}>
                {new Date(log.timestamp).toLocaleString()}
              </div>
            </div>
            {/* Star rating */}
            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => rate(log.id, n)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                  color: log.rating >= n ? 'var(--yellow)' : 'var(--border2)',
                  fontSize: 14, lineHeight: 1,
                }}>★</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 800, color: color || 'var(--text)' }}>{value}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase' }}>{label}</div>
    </div>
  )
}