import { useState } from 'react'
import { Search, ChevronDown, ChevronUp } from 'lucide-react'
import { PageHeader, RunButton } from '../ui.jsx'

const PRIORITY_COLORS = {
  apply_now:        { bg: 'rgba(5,150,105,0.12)',  border: 'rgba(5,150,105,0.4)',  text: 'var(--green)',  label: 'Apply now' },
  apply_this_week:  { bg: 'rgba(37,99,235,0.12)',  border: 'rgba(37,99,235,0.4)',  text: '#2563eb',       label: 'Apply this week' },
  low_priority:     { bg: 'rgba(217,119,6,0.12)',  border: 'rgba(217,119,6,0.4)',  text: '#d97706',       label: 'Low priority' },
  skip:             { bg: 'rgba(220,38,38,0.12)',  border: 'rgba(220,38,38,0.4)',  text: 'var(--red)',    label: 'Skip' },
}

const CALLBACK_COLORS = {
  High:   'var(--green)',
  Medium: '#d97706',
  Low:    'var(--red)',
}

function ScoreBar({ label, value, color }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        marginBottom: 4, fontSize: 11,
      }}>
        <span style={{ color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{label}</span>
        <span style={{ color, fontFamily: 'var(--mono)', fontWeight: 600 }}>{value}/100</span>
      </div>
      <div style={{
        height: 5, background: 'var(--surface)',
        borderRadius: 3, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: 3,
          width: `${Math.min(value, 100)}%`,
          background: color,
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  )
}

function ResultCard({ result }) {
  const [showDetail, setShowDetail] = useState(false)
  const priority = PRIORITY_COLORS[result.priority_group] || PRIORITY_COLORS.low_priority
  const callbackColor = CALLBACK_COLORS[result.callback_probability] || 'var(--text3)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Score hero */}
      <div className="card" style={{
        borderLeft: `3px solid ${priority.border}`,
        borderRadius: '0 8px 8px 0',
      }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', marginBottom: 16,
        }}>
          <div>
            <div style={{
              fontSize: 11, fontFamily: 'var(--mono)',
              color: 'var(--text3)', letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: 6,
            }}>
              Fit score
            </div>
            <div style={{
              fontSize: 52, fontWeight: 800,
              fontFamily: 'var(--mono)', lineHeight: 1,
              color: priority.text,
            }}>
              {result.composite_score ?? '—'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              display: 'inline-block',
              padding: '5px 12px', borderRadius: 6,
              background: priority.bg,
              border: `1px solid ${priority.border}`,
              color: priority.text,
              fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
              marginBottom: 8,
            }}>
              {priority.label}
            </div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 11,
              color: 'var(--text3)', marginBottom: 2,
            }}>
              Callback probability
            </div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 16,
              fontWeight: 700, color: callbackColor,
            }}>
              {result.callback_probability_pct ?? '—'}%
              <span style={{ fontSize: 11, marginLeft: 6 }}>
                ({result.callback_probability})
              </span>
            </div>
          </div>
        </div>

        {/* Score bars */}
        <ScoreBar label="Skill match"    value={result.skill_match_score  ?? 0} color="var(--accent)" />
        <ScoreBar label="Pattern fit"    value={result.pattern_fit_score  ?? 0} color="#2563eb" />
        <ScoreBar label="Competition"
          value={
            result.competition_risk === 'Low' ? 80 :
            result.competition_risk === 'Medium' ? 50 : 20
          }
          color={
            result.competition_risk === 'Low' ? 'var(--green)' :
            result.competition_risk === 'Medium' ? '#d97706' : 'var(--red)'
          }
        />
      </div>

      {/* Recommended action */}
      <div className="card">
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 10,
          color: 'var(--text3)', letterSpacing: '0.12em',
          textTransform: 'uppercase', marginBottom: 10,
        }}>
          Recommended action
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
          {result.recommended_action}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
          {result.action_reasoning}
        </div>
        {result.what_to_lead_with && (
          <div style={{
            marginTop: 12, padding: '8px 12px',
            background: 'rgba(139,92,246,0.08)',
            borderRadius: 6, fontSize: 12,
            color: 'var(--accent)', fontFamily: 'var(--mono)',
          }}>
            Lead with: {result.what_to_lead_with}
          </div>
        )}
      </div>

      {/* Why high / Why low */}
      {(result.why_high?.length > 0 || result.why_low?.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {result.why_high?.length > 0 && (
            <div className="card">
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 10,
                color: 'var(--green)', letterSpacing: '0.12em',
                textTransform: 'uppercase', marginBottom: 10,
              }}>
                Working in your favour
              </div>
              {result.why_high.map((item, i) => (
                <div key={i} style={{
                  fontSize: 12, color: 'var(--text2)',
                  marginBottom: 6, display: 'flex', gap: 8, lineHeight: 1.4,
                }}>
                  <span style={{ color: 'var(--green)', flexShrink: 0 }}>✓</span>
                  {item}
                </div>
              ))}
            </div>
          )}
          {result.why_low?.length > 0 && (
            <div className="card">
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 10,
                color: 'var(--red)', letterSpacing: '0.12em',
                textTransform: 'uppercase', marginBottom: 10,
              }}>
                Working against you
              </div>
              {result.why_low.map((item, i) => (
                <div key={i} style={{
                  fontSize: 12, color: 'var(--text2)',
                  marginBottom: 6, display: 'flex', gap: 8, lineHeight: 1.4,
                }}>
                  <span style={{ color: 'var(--red)', flexShrink: 0 }}>✗</span>
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pattern fit detail — collapsible */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <button
          onClick={() => setShowDetail(d => !d)}
          style={{
            width: '100%', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', background: 'none',
            border: 'none', cursor: 'pointer',
            color: 'var(--text2)', fontSize: 12,
          }}
        >
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 10,
            color: 'var(--text3)', letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            Pattern fit explanation
          </span>
          {showDetail
            ? <ChevronUp size={14} color="var(--text3)" />
            : <ChevronDown size={14} color="var(--text3)" />
          }
        </button>
        {showDetail && (
          <div style={{
            padding: '0 16px 16px',
            borderTop: '1px solid var(--border)',
          }}>
            <p style={{
              fontSize: 13, color: 'var(--text2)',
              lineHeight: 1.6, marginTop: 12,
            }}>
              {result.one_line_reason || 'Score based on skill match and historical response patterns for this candidate.'}
            </p>
            {result.pattern_fit && (
              <div style={{
                marginTop: 10,
                display: 'inline-block',
                padding: '3px 10px', borderRadius: 4,
                fontFamily: 'var(--mono)', fontSize: 11,
                background: result.pattern_fit === 'high' ? 'rgba(5,150,105,0.12)' :
                             result.pattern_fit === 'medium' ? 'rgba(217,119,6,0.12)' :
                             'rgba(220,38,38,0.12)',
                color: result.pattern_fit === 'high' ? 'var(--green)' :
                       result.pattern_fit === 'medium' ? '#d97706' : 'var(--red)',
              }}>
                Pattern fit: {result.pattern_fit}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}

export default function FitScorer() {
  const [job, setJob]       = useState({
    id: 'job_001',
    company: '', role: '',
    location: '', remote: '',
    required_skills: '',
    tech_stack: '',
    seniority_level: '',
    company_size: '',
    description: '',
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState('')

  function setField(k, v) {
    setJob(j => ({ ...j, [k]: v }))
  }

  function buildJobPayload() {
    return {
      id: job.id || 'job_001',
      company: job.company,
      role: job.role,
      location: job.location,
      remote: job.remote || 'Unknown',
      required_skills: job.required_skills
        ? job.required_skills.split(',').map(s => s.trim()).filter(Boolean)
        : [],
      tech_stack: job.tech_stack
        ? job.tech_stack.split(',').map(s => s.trim()).filter(Boolean)
        : [],
      seniority_level: job.seniority_level || 'Mid',
      company_size: job.company_size || 'Startup',
      description: job.description,
    }
  }

  async function score() {
    if (!job.company || !job.role) return
    setLoading(true)
    setResult(null)
    setError('')
    try {
      const data = await fetch('/api/loop/score/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: buildJobPayload() }),
      }).then(r => r.json())

      if (data.error) {
        setError(data.error)
      } else {
        setResult(data)
      }
    } catch (e) {
      setError('Failed to score — check backend connection')
    } finally {
      setLoading(false)
    }
  }

  const canRun = job.company && job.role

  return (
    <div className="fade-in">
      <PageHeader
        tag="Opportunity scoring — loop agent 2"
        title="Fit Scorer"
        desc="Score any job for callback probability based on your actual application history"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24 }}>

        {/* Left — job input form */}
        <div>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 10,
            color: 'var(--text3)', letterSpacing: '0.12em',
            textTransform: 'uppercase', marginBottom: 14,
          }}>
            Job details
          </div>

          {[
            { label: 'Company *',     k: 'company',    placeholder: 'Sarvam AI' },
            { label: 'Role *',        k: 'role',       placeholder: 'AI Engineer' },
            { label: 'Location',      k: 'location',   placeholder: 'Bengaluru / Remote' },
            { label: 'Seniority',     k: 'seniority_level', placeholder: 'Junior / Mid / Senior' },
            { label: 'Company size',  k: 'company_size',    placeholder: 'Startup / Mid-size / Enterprise' },
          ].map(({ label, k, placeholder }) => (
            <div key={k} className="form-group">
              <label>{label}</label>
              <input
                value={job[k]}
                onChange={e => setField(k, e.target.value)}
                placeholder={placeholder}
              />
            </div>
          ))}

          <div className="form-group">
            <label>Required skills <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(comma separated)</span></label>
            <input
              value={job.required_skills}
              onChange={e => setField('required_skills', e.target.value)}
              placeholder="PyTorch, LLMs, FastAPI, RAG"
            />
          </div>

          <div className="form-group">
            <label>Tech stack <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(comma separated)</span></label>
            <input
              value={job.tech_stack}
              onChange={e => setField('tech_stack', e.target.value)}
              placeholder="Python, HuggingFace, Docker"
            />
          </div>

          <div className="form-group">
            <label>Job description <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(paste full JD for best results)</span></label>
            <textarea
              value={job.description}
              onChange={e => setField('description', e.target.value)}
              placeholder="Paste the full job description here..."
              style={{ minHeight: 120 }}
            />
          </div>

          <RunButton loading={loading} onClick={score} disabled={!canRun}>
            <Search size={12} /> Score this role
          </RunButton>

          {error && (
            <div style={{
              marginTop: 12, padding: '8px 12px',
              background: 'rgba(220,38,38,0.1)',
              borderRadius: 6, fontSize: 12,
              color: 'var(--red)', fontFamily: 'var(--mono)',
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Right — result */}
        <div>
          {!result && !loading && (
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', height: 300,
              color: 'var(--text3)', fontFamily: 'var(--mono)',
              fontSize: 12, flexDirection: 'column', gap: 8,
              border: '1px dashed var(--border)', borderRadius: 8,
            }}>
              <Search size={20} color="var(--text3)" />
              Fill in company and role, then hit Score
            </div>
          )}
          {loading && (
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', height: 300,
              color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 12,
              flexDirection: 'column', gap: 8,
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                border: '2px solid var(--border)',
                borderTopColor: 'var(--accent)',
                animation: 'spin 0.8s linear infinite',
              }} />
              Scoring against your history…
            </div>
          )}
          {result && <ResultCard result={result} />}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}