// ResumeStudio.jsx
import { useState } from 'react'
import { FileText, Zap, Search, Code, BarChart2 } from 'lucide-react'
import { PageHeader, SectionTitle, RunButton } from './ui.jsx'

const TABS = [
  { id: 'optimize', label: 'Optimize (A/B)', icon: Zap, desc: 'Full pipeline — ATS score, rewrites, A/B variants' },
  { id: 'analyze', label: 'Quick Analyze', icon: BarChart2, desc: 'Fast gap check without full rewrite' },
  { id: 'parse', label: 'Parse Resume', icon: Code, desc: 'Convert raw resume into structured JSON' },
  { id: 'analyze-jd', label: 'Analyze JD', icon: Search, desc: 'Deep analysis of a job description' },
]

export default function ResumeStudio() {
  const [tab, setTab]       = useState('optimize')
  const [loading, setLoad]  = useState(false)
  const [result, setResult] = useState(null)

  const [jd, setJd]               = useState('')
  const [resumeText, setResumeText] = useState('')
  const [jdOnly, setJdOnly]        = useState('')

  async function run() {
    setLoad(true); setResult(null)
    try {
      let endpoint, payload
      if (tab === 'optimize') {
        if (!jd.trim()) return
        endpoint = '/api/resume/optimize'
        payload  = { job_description: jd }
      } else if (tab === 'analyze') {
        if (!jd.trim()) return
        endpoint = '/api/resume/analyze'
        payload  = { job_description: jd }
      } else if (tab === 'parse') {
        if (!resumeText.trim()) return
        endpoint = '/api/resume/parse'
        payload  = { resume_text: resumeText }
      } else {
        if (!jdOnly.trim()) return
        endpoint = '/api/resume/analyze-jd'
        payload  = { job_description: jdOnly }
      }
      const data = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(r => r.json())
      setResult(data)
    } finally { setLoad(false) }
  }

  const canRun = tab === 'parse' ? resumeText.trim() : tab === 'analyze-jd' ? jdOnly.trim() : jd.trim()

  const scoreColor = s => s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--yellow)' : 'var(--red)'

  return (
    <div className="fade-in">
      <PageHeader tag="Resume Agent v2" title="Resume Studio" desc="ATS scoring, gap analysis, A/B rewrites, JD decoding" />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setResult(null) }} style={{
            padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
            border: tab === t.id ? '1px solid var(--accent2)' : '1px solid var(--border)',
            background: tab === t.id ? 'var(--accent2)' : 'var(--bg2)',
            color: tab === t.id ? '#000' : 'var(--text2)',
            fontWeight: tab === t.id ? 600 : 400,
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 1.6fr' : '1fr', gap: 24 }}>
        {/* Input */}
        <div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>{TABS.find(t => t.id === tab)?.desc}</div>

          {(tab === 'optimize' || tab === 'analyze') && (
            <div className="form-group">
              <label>Job Description *</label>
              <textarea value={jd} onChange={e => setJd(e.target.value)} placeholder="Paste the full job description here..." style={{ minHeight: 280 }} />
            </div>
          )}
          {tab === 'parse' && (
            <div className="form-group">
              <label>Resume Text *</label>
              <textarea value={resumeText} onChange={e => setResumeText(e.target.value)} placeholder="Paste your full resume text here..." style={{ minHeight: 280 }} />
            </div>
          )}
          {tab === 'analyze-jd' && (
            <div className="form-group">
              <label>Job Description *</label>
              <textarea value={jdOnly} onChange={e => setJdOnly(e.target.value)} placeholder="Paste the job description to decode..." style={{ minHeight: 280 }} />
            </div>
          )}

          <RunButton loading={loading} onClick={run} disabled={!canRun}>
            <Zap size={12} /> {tab === 'optimize' ? 'Optimize Resume' : tab === 'analyze' ? 'Quick Analyze' : tab === 'parse' ? 'Parse Resume' : 'Decode JD'}
          </RunButton>
        </div>

        {/* Results */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {tab === 'optimize' && <OptimizeResults data={result} scoreColor={scoreColor} />}
            {tab === 'analyze' && <AnalyzeResults data={result} scoreColor={scoreColor} />}
            {tab === 'parse' && <ParseResults data={result} />}
            {tab === 'analyze-jd' && <JDResults data={result} />}
          </div>
        )}
      </div>
    </div>
  )
}

function ScoreRing({ score, label }) {
  const color = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--yellow)' : 'var(--red)'
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 36, fontWeight: 800, fontFamily: 'var(--mono)', color }}>{score}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
      <div className="score-bar" style={{ marginTop: 6, width: 80 }}>
        <div className="score-fill" style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  )
}

function OptimizeResults({ data, scoreColor }) {
  const [activeVariant, setActiveVariant] = useState('a')

  return <>
    {/* Scores */}
    <div className="card" style={{ display: 'flex', gap: 24 }}>
      <ScoreRing score={data.ats_score || 0} label="ATS Score" />
      <ScoreRing score={data.match_percentage || 0} label="JD Match" />
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{data.overall_recommendation}</p>
        {data.recommendation && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--accent2)' }}>
            ★ {data.recommendation}
          </div>
        )}
      </div>
    </div>

    {/* Keywords */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div className="card">
        <SectionTitle>Found Keywords</SectionTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(data.found_keywords || []).map((k, i) => <span key={i} className="tag tag-green">{k}</span>)}
        </div>
      </div>
      <div className="card">
        <SectionTitle>Missing Keywords</SectionTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(data.missing_keywords || []).map((k, i) => <span key={i} className="tag tag-red">{k}</span>)}
        </div>
      </div>
    </div>

    {/* A/B Variants */}
    {(data.variant_a || data.variant_b) && (
      <div className="card">
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <SectionTitle>Rewrite Variants</SectionTitle>
          <button onClick={() => setActiveVariant('a')} style={{ padding: '4px 12px', borderRadius: 4, fontSize: 12, cursor: 'pointer', border: '1px solid var(--border2)', background: activeVariant === 'a' ? 'var(--accent2)' : 'var(--bg3)', color: activeVariant === 'a' ? '#000' : 'var(--text2)' }}>
            Variant A {data.variant_a?.ats_score && `(ATS: ${data.variant_a.ats_score})`}
          </button>
          <button onClick={() => setActiveVariant('b')} style={{ padding: '4px 12px', borderRadius: 4, fontSize: 12, cursor: 'pointer', border: '1px solid var(--border2)', background: activeVariant === 'b' ? 'var(--accent2)' : 'var(--bg3)', color: activeVariant === 'b' ? '#000' : 'var(--text2)' }}>
            Variant B {data.variant_b?.ats_score && `(ATS: ${data.variant_b.ats_score})`}
          </button>
        </div>
        {activeVariant === 'a' && data.variant_a && (
          <>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>{data.variant_a.description}</div>
            {data.variant_a.summary && (
              <div style={{ background: 'var(--bg3)', borderRadius: 6, padding: 12, marginBottom: 12 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', marginBottom: 6 }}>SUMMARY</div>
                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{data.variant_a.summary}</p>
              </div>
            )}
            {data.variant_a.rewritten_bullets?.map((b, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 4, textDecoration: 'line-through' }}>{b.original}</div>
                <div style={{ fontSize: 12, color: 'var(--green)', lineHeight: 1.5 }}>→ {b.improved}</div>
              </div>
            ))}
          </>
        )}
        {activeVariant === 'b' && data.variant_b && (
          <>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>{data.variant_b.description}</div>
            {data.variant_b.summary && (
              <div style={{ background: 'var(--bg3)', borderRadius: 6, padding: 12, marginBottom: 12 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', marginBottom: 6 }}>SUMMARY</div>
                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{data.variant_b.summary}</p>
              </div>
            )}
            {data.variant_b.rewritten_bullets?.map((b, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 4, textDecoration: 'line-through' }}>{b.original}</div>
                <div style={{ fontSize: 12, color: 'var(--green)', lineHeight: 1.5 }}>→ {b.improved}</div>
              </div>
            ))}
          </>
        )}
      </div>
    )}

    {/* Rewritten bullets (fallback) */}
    {!data.variant_a && data.rewritten_bullets?.length > 0 && (
      <div className="card">
        <SectionTitle>Rewritten Bullets</SectionTitle>
        {data.rewritten_bullets.map((b, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 4, textDecoration: 'line-through' }}>{b.original}</div>
            <div style={{ fontSize: 12, color: 'var(--green)', lineHeight: 1.5 }}>→ {b.improved}</div>
          </div>
        ))}
      </div>
    )}

    {data.summary_suggestion && (
      <div className="card">
        <SectionTitle>Summary Suggestion</SectionTitle>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{data.summary_suggestion}</p>
      </div>
    )}
  </>
}

function AnalyzeResults({ data, scoreColor }) {
  return <>
    <div className="card" style={{ display: 'flex', gap: 24 }}>
      <ScoreRing score={data.ats_score || 0} label="ATS Score" />
      <ScoreRing score={data.match_percentage || 0} label="Match %" />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: data.overall_verdict === 'pass' ? 'var(--green)' : data.overall_verdict === 'fail' ? 'var(--red)' : 'var(--yellow)', marginBottom: 8 }}>
          VERDICT: {(data.overall_verdict || '').toUpperCase()}
        </div>
        {data.top_3_fixes?.map((f, i) => (
          <div key={i} style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, display: 'flex', gap: 8 }}>
            <span style={{ color: 'var(--accent2)' }}>{i+1}.</span> {f}
          </div>
        ))}
      </div>
    </div>

    {data.skill_alignment && (
      <div className="card">
        <SectionTitle>Skill Alignment</SectionTitle>
        {data.skill_alignment.strong_matches?.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>STRONG MATCHES</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {data.skill_alignment.strong_matches.map((s, i) => <span key={i} className="tag tag-green">{s}</span>)}
            </div>
          </div>
        )}
        {data.skill_alignment.missing_critical?.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>MISSING (CRITICAL)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {data.skill_alignment.missing_critical.map((s, i) => <span key={i} className="tag tag-red">{s}</span>)}
            </div>
          </div>
        )}
      </div>
    )}

    {data.section_scores && (
      <div className="card">
        <SectionTitle>Section Scores</SectionTitle>
        {Object.entries(data.section_scores).map(([sec, score]) => (
          <div key={sec} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 80, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>{sec}</div>
            <div style={{ flex: 1, height: 6, background: 'var(--bg3)', borderRadius: 3 }}>
              <div style={{ width: `${score * 10}%`, height: '100%', borderRadius: 3, background: score >= 7 ? 'var(--green)' : score >= 5 ? 'var(--yellow)' : 'var(--red)', transition: 'width 0.5s' }} />
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)', width: 30 }}>{score}/10</div>
          </div>
        ))}
      </div>
    )}

    {data.bullet_weaknesses?.length > 0 && (
      <div className="card">
        <SectionTitle>Bullet Weaknesses</SectionTitle>
        {data.bullet_weaknesses.map((b, i) => (
          <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: i < data.bullet_weaknesses.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, fontStyle: 'italic' }}>"{b.bullet}"</div>
            <div style={{ fontSize: 11, color: 'var(--red)' }}>Issue: {b.issue}</div>
            <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2 }}>Fix: {b.quick_fix}</div>
          </div>
        ))}
      </div>
    )}
  </>
}

function ParseResults({ data }) {
  return <>
    {data.name && (
      <div className="card">
        <SectionTitle>Parsed Identity</SectionTitle>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{data.name}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {data.contact && Object.entries(data.contact).filter(([,v]) => v).map(([k, v]) => (
            <span key={k} className="tag tag-blue">{k}: {v}</span>
          ))}
        </div>
        {data.parse_quality && (
          <div style={{ marginTop: 10, fontSize: 12, color: data.parse_quality === 'good' ? 'var(--green)' : 'var(--yellow)' }}>
            Parse quality: {data.parse_quality}
          </div>
        )}
      </div>
    )}
    {data.education?.length > 0 && (
      <div className="card">
        <SectionTitle>Education</SectionTitle>
        {data.education.map((e, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{e.degree} — {e.institution}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{e.year} {e.gpa && `· GPA: ${e.gpa}`}</div>
          </div>
        ))}
      </div>
    )}
    {data.experience?.length > 0 && (
      <div className="card">
        <SectionTitle>Experience ({data.experience.length})</SectionTitle>
        {data.experience.map((ex, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{ex.title} — {ex.company}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>{ex.duration}</div>
            {ex.bullets?.map((b, j) => <div key={j} style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 2 }}>• {b}</div>)}
          </div>
        ))}
      </div>
    )}
    {data.skills && (
      <div className="card">
        <SectionTitle>Skills Extracted</SectionTitle>
        {Object.entries(data.skills).filter(([,v]) => v?.length > 0).map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: 10 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 6 }}>{cat}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(items || []).map((s, i) => <span key={i} className="tag tag-blue">{s}</span>)}
            </div>
          </div>
        ))}
      </div>
    )}
  </>
}

function JDResults({ data }) {
  return <>
    {data.role_type && (
      <div className="card" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="tag tag-purple">{data.role_type}</span>
        <span className="tag tag-blue">{data.seniority}</span>
        {data.overall_verdict && <span className={`tag ${data.overall_verdict === 'pass' ? 'tag-green' : 'tag-red'}`}>{data.overall_verdict}</span>}
        <div style={{ flex: 1, fontSize: 13, color: 'var(--text2)' }}>{data.story_they_want}</div>
      </div>
    )}
    {data.must_have_skills?.length > 0 && (
      <div className="card">
        <SectionTitle>Must-Have Skills</SectionTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {data.must_have_skills.map((s, i) => <span key={i} className="tag tag-red">{s}</span>)}
        </div>
      </div>
    )}
    {data.ats_keywords?.length > 0 && (
      <div className="card">
        <SectionTitle>ATS Keywords (Include in Resume)</SectionTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {data.ats_keywords.map((k, i) => <span key={i} className="tag tag-green">{k}</span>)}
        </div>
      </div>
    )}
    {data.emphasis_weights && (
      <div className="card">
        <SectionTitle>What They Emphasize</SectionTitle>
        {Object.entries(data.emphasis_weights).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 140, fontSize: 12, color: 'var(--text3)', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</div>
            <div style={{ flex: 1, height: 6, background: 'var(--bg3)', borderRadius: 3 }}>
              <div style={{ width: `${v * 10}%`, height: '100%', borderRadius: 3, background: 'var(--accent2)', transition: 'width 0.5s' }} />
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)', width: 20 }}>{v}</div>
          </div>
        ))}
      </div>
    )}
    {data.hidden_requirements?.length > 0 && (
      <div className="card">
        <SectionTitle>Hidden Requirements (Not Stated But Expected)</SectionTitle>
        {data.hidden_requirements.map((r, i) => (
          <div key={i} style={{ fontSize: 12, color: 'var(--yellow)', marginBottom: 4, display: 'flex', gap: 8 }}>
            <span>⚠</span> {r}
          </div>
        ))}
      </div>
    )}
    {data.interview_likely_focus?.length > 0 && (
      <div className="card">
        <SectionTitle>Likely Interview Focus</SectionTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {data.interview_likely_focus.map((t, i) => <span key={i} className="tag tag-cyan">{t}</span>)}
        </div>
      </div>
    )}
    {data.team_context && (
      <div className="card">
        <SectionTitle>Team Context</SectionTitle>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{data.team_context}</p>
      </div>
    )}
  </>
}
