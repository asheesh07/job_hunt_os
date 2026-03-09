import { useState } from 'react'
import { TrendingUp, GitCompare } from 'lucide-react'
import { PageHeader, SectionTitle, RunButton } from './ui.jsx'

export default function SkillGap() {
  const [tab, setTab]       = useState('single')
  const [loading, setLoad]  = useState(false)
  const [result, setResult] = useState(null)

  // Single role form
  const [role, setRole]         = useState('')
  const [jd, setJd]             = useState('')
  const [goals, setGoals]       = useState('')
  const [signals, setSignals]   = useState('')

  // Multi role form
  const [roles, setRoles]       = useState(['', '', ''])

  async function runSingle() {
    if (!role.trim()) return
    setLoad(true); setResult(null)
    try {
      const data = await fetch('/api/skill-gap/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_role: role, job_description: jd, career_goals: goals, market_signals: signals }),
      }).then(r => r.json())
      setResult(data)
    } finally { setLoad(false) }
  }

  async function runMulti() {
    const activeRoles = roles.filter(r => r.trim())
    if (activeRoles.length < 2) return
    setLoad(true); setResult(null)
    try {
      const data = await fetch('/api/skill-gap/multi-role', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_roles: activeRoles, career_goals: goals }),
      }).then(r => r.json())
      setResult({ _type: 'multi', ...data })
    } finally { setLoad(false) }
  }

  const impColor = i => i === 'critical' ? 'tag-red' : i === 'important' ? 'tag-yellow' : 'tag-blue'

  return (
    <div className="fade-in">
      <PageHeader tag="Skill Gap Agent v2" title="Skill Gap Analyzer" desc="Career roadmap, 30-60-90 plan, multi-role comparison" />

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {[{ id: 'single', label: 'Single Role' }, { id: 'multi', label: 'Compare Roles' }].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setResult(null) }} style={{
            padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
            border: tab === t.id ? '1px solid var(--accent2)' : '1px solid var(--border)',
            background: tab === t.id ? 'var(--accent2)' : 'var(--bg2)',
            color: tab === t.id ? '#000' : 'var(--text2)', fontWeight: tab === t.id ? 600 : 400,
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>
        {/* Input */}
        <div>
          {tab === 'single' ? <>
            <div className="form-group"><label>Target Role *</label><input value={role} onChange={e => setRole(e.target.value)} placeholder="AI Researcher at LLM startup" /></div>
            <div className="form-group"><label>Job Description (optional)</label><textarea value={jd} onChange={e => setJd(e.target.value)} placeholder="Paste JD for precise gap analysis..." style={{ minHeight: 120 }} /></div>
            <div className="form-group"><label>Career Goals</label><input value={goals} onChange={e => setGoals(e.target.value)} placeholder="Long-term ambitions..." /></div>
            <div className="form-group"><label>Market Signals</label><input value={signals} onChange={e => setSignals(e.target.value)} placeholder="Current market context..." /></div>
            <RunButton loading={loading} onClick={runSingle} disabled={!role.trim()}>
              <TrendingUp size={12} /> Analyze Gaps
            </RunButton>
          </> : <>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>Compare your fit across 2-3 different roles</div>
            {roles.map((r, i) => (
              <div key={i} className="form-group">
                <label>Role {i+1} {i < 2 ? '*' : '(optional)'}</label>
                <input value={r} onChange={e => setRoles(rs => rs.map((v, j) => j === i ? e.target.value : v))} placeholder={['AI Researcher', 'ML Engineer', 'Research Engineer'][i]} />
              </div>
            ))}
            <div className="form-group"><label>Career Goals</label><input value={goals} onChange={e => setGoals(e.target.value)} placeholder="What do you want long-term?" /></div>
            <RunButton loading={loading} onClick={runMulti} disabled={roles.filter(r => r.trim()).length < 2}>
              <GitCompare size={12} /> Compare Roles
            </RunButton>
          </>}
        </div>

        {/* Results */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {result._type === 'multi' ? <MultiResults data={result} /> : <SingleResults data={result} impColor={impColor} />}
          </div>
        )}
      </div>
    </div>
  )
}

function SingleResults({ data, impColor }) {
  return <>
    {/* Readiness + Assessment */}
    {data.overall_readiness !== undefined && (
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{
            fontSize: 48, fontWeight: 800, fontFamily: 'var(--mono)',
            color: data.overall_readiness >= 70 ? 'var(--green)' : data.overall_readiness >= 50 ? 'var(--yellow)' : 'var(--red)',
          }}>{data.overall_readiness}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase' }}>Readiness %</div>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 10 }}>{data.honest_assessment}</p>
          {data.competitive_advantage && (
            <div style={{ fontSize: 13, color: 'var(--green)', display: 'flex', gap: 8 }}>
              <span>★</span> {data.competitive_advantage}
            </div>
          )}
        </div>
      </div>
    )}

    {/* Skills you have */}
    {data.skills_you_have?.length > 0 && (
      <div className="card">
        <SectionTitle>Skills You Have ✓</SectionTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {data.skills_you_have.map((s, i) => (
            <div key={i} style={{ padding: '4px 10px', background: '#14532d', borderRadius: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>{s.skill}</span>
              <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 6 }}>{s.level}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Gaps */}
    {data.skills_you_lack?.length > 0 && (
      <div className="card">
        <SectionTitle>Skills to Build</SectionTitle>
        {data.skills_you_lack.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12, paddingBottom: 12, borderBottom: i < data.skills_you_lack.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <span className={`tag ${impColor(s.importance)}`} style={{ flexShrink: 0 }}>{s.importance}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{s.skill}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{s.why_it_matters}</div>
            </div>
            <span className="tag tag-blue" style={{ marginLeft: 'auto', flexShrink: 0 }}>{s.gap_size} gap</span>
          </div>
        ))}
      </div>
    )}

    {/* 30-60-90 day plan */}
    {data.thirty_sixty_ninety && (
      <div className="card">
        <SectionTitle>30 / 60 / 90 Day Plan</SectionTitle>
        {Object.entries(data.thirty_sixty_ninety).map(([period, plan]) => (
          <div key={period} style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent2)', width: 60, flexShrink: 0 }}>{period.replace('_', ' ')}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{plan.focus}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 2 }}>Goal: {plan.milestone}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>↳ {plan.deliverable}</div>
            </div>
          </div>
        ))}
      </div>
    )}

    {/* 6-week roadmap */}
    {data.six_week_roadmap?.length > 0 && (
      <div className="card">
        <SectionTitle>6-Week Study Roadmap</SectionTitle>
        {data.six_week_roadmap.map((w, i) => (
          <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent2)', width: 80, flexShrink: 0 }}>{w.week}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{w.focus}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>Goal: {w.goal}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {w.resources?.map((r, j) => <span key={j} className="tag tag-blue">{r}</span>)}
              </div>
            </div>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>{w.daily_hours}h/day</span>
          </div>
        ))}
      </div>
    )}

    {/* Interview risks */}
    {data.interview_risks?.length > 0 && (
      <div className="card">
        <SectionTitle>Interview Risks</SectionTitle>
        {data.interview_risks.map((r, i) => (
          <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: i < data.interview_risks.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--yellow)' }}>⚠ {r.topic}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Current: {r.current_level}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Prep: {r.prep_strategy}</div>
          </div>
        ))}
      </div>
    )}

    {/* Quick wins */}
    {data.quick_wins?.length > 0 && (
      <div className="card">
        <SectionTitle>Quick Wins (Today)</SectionTitle>
        {data.quick_wins.map((w, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <span style={{ color: 'var(--yellow)' }}>⚡</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{w.action}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{w.impact}</div>
            </div>
          </div>
        ))}
      </div>
    )}

    {/* Projects to build */}
    {data.projects_to_build?.length > 0 && (
      <div className="card">
        <SectionTitle>Projects to Build</SectionTitle>
        {data.projects_to_build.map((p, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{p.project}</div>
              <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                {p.skills_it_demonstrates?.map((s, j) => <span key={j} className="tag tag-purple">{s}</span>)}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)' }}>{p.estimated_time}</div>
              <span className={`tag ${p.difficulty === 'hard' ? 'tag-red' : p.difficulty === 'medium' ? 'tag-yellow' : 'tag-green'}`}>{p.difficulty}</span>
            </div>
          </div>
        ))}
      </div>
    )}
  </>
}

function MultiResults({ data }) {
  return <>
    {data.role_comparison?.length > 0 && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data.role_comparison.map((r, i) => (
          <div key={i} className="card">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--mono)', color: r.readiness_score >= 70 ? 'var(--green)' : r.readiness_score >= 50 ? 'var(--yellow)' : 'var(--red)' }}>
                  {r.readiness_score}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase' }}>%</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{r.role}</div>
                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5, marginBottom: 8 }}>{r.fit_summary}</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className="tag tag-red">Gap: {r.biggest_gap}</span>
                  <span className="tag tag-green">Strength: {r.biggest_strength}</span>
                  <span className="tag tag-blue">{r.time_to_ready}</span>
                  <span className={`tag ${r.competition_level === 'very high' || r.competition_level === 'high' ? 'tag-red' : 'tag-yellow'}`}>
                    Competition: {r.competition_level}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
    {data.recommended_primary && (
      <div className="card">
        <SectionTitle>Recommendation</SectionTitle>
        <div style={{ fontSize: 13, color: 'var(--green)', marginBottom: 8 }}>★ Primary: {data.recommended_primary}</div>
        {data.recommended_backup && <div style={{ fontSize: 13, color: 'var(--text2)' }}>Backup: {data.recommended_backup}</div>}
      </div>
    )}
    {data.skills_that_transfer?.length > 0 && (
      <div className="card">
        <SectionTitle>Skills Useful Across All Roles</SectionTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {data.skills_that_transfer.map((s, i) => <span key={i} className="tag tag-cyan">{s}</span>)}
        </div>
      </div>
    )}
    {data.unified_study_plan?.length > 0 && (
      <div className="card">
        <SectionTitle>Unified Study Plan</SectionTitle>
        {data.unified_study_plan.map((w, i) => (
          <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent2)', width: 80, flexShrink: 0 }}>{w.week}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{w.focus}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{w.goal}</div>
            </div>
          </div>
        ))}
      </div>
    )}
    {data.strategic_advice && (
      <div className="card">
        <SectionTitle>Strategic Advice</SectionTitle>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{data.strategic_advice}</p>
      </div>
    )}
  </>
}
