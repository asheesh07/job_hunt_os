// InterviewPrep.jsx
import { useState } from 'react'
import { MessageSquare, ChevronDown, ChevronRight } from 'lucide-react'
import { PageHeader, SectionTitle, RunButton } from './ui.jsx'

export default function InterviewPrep() {
  const [form, setForm]   = useState({ company: '', role: '', job_description: '' })
  const [loading, setLoad] = useState(false)
  const [result, setResult] = useState(null)
  const [open, setOpen]   = useState({})

  async function run() {
    if (!form.company || !form.role) return
    setLoad(true); setResult(null)
    try {
      const data = await fetch('/api/agents/interview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      }).then(r => r.json())
      setResult(data)
    } finally { setLoad(false) }
  }

  const toggle = k => setOpen(o => ({...o, [k]: !o[k]}))

  const diffColor = d => d === 'hard' ? 'tag-red' : d === 'medium' ? 'tag-yellow' : 'tag-green'
  const catColor  = c => c === 'technical' ? 'tag-blue' : c === 'system_design' ? 'tag-purple' : 'tag-cyan'

  return (
    <div className="fade-in">
      <PageHeader tag="Interview Agent" title="Interview Prep" desc="Role-specific questions and model answers using your actual projects" />
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>
        <div>
          <div className="form-group"><label>Company</label><input value={form.company} onChange={e => setForm(f => ({...f, company: e.target.value}))} placeholder="Sarvam.ai" /></div>
          <div className="form-group"><label>Role</label><input value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))} placeholder="AI Researcher" /></div>
          <div className="form-group"><label>Job Description (optional)</label><textarea value={form.job_description} onChange={e => setForm(f => ({...f, job_description: e.target.value}))} placeholder="Paste JD for more specific questions..." style={{ minHeight: 150 }} /></div>
          <RunButton loading={loading} onClick={run} disabled={!form.company || !form.role}>
            <MessageSquare size={12} /> Generate Prep
          </RunButton>
        </div>

        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Company questions */}
            {result.company_specific_questions?.length > 0 && (
              <div className="card">
                <SectionTitle>Likely Interview Questions ({result.company_specific_questions.length})</SectionTitle>
                {result.company_specific_questions.map((q, i) => (
                  <div key={i} style={{ marginBottom: 12, borderBottom: i < result.company_specific_questions.length - 1 ? '1px solid var(--border)' : 'none', paddingBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }} onClick={() => toggle(`q_${i}`)}>
                      <span style={{ color: 'var(--text3)', fontSize: 12, marginTop: 1 }}>{open[`q_${i}`] ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.5 }}>{q.question}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                          <span className={`tag ${catColor(q.category)}`}>{q.category}</span>
                          <span className={`tag ${diffColor(q.difficulty)}`}>{q.difficulty}</span>
                        </div>
                      </div>
                    </div>
                    {open[`q_${i}`] && (
                      <div style={{ marginTop: 10, marginLeft: 22 }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>WHY THEY'LL ASK: {q.why_theyll_ask}</div>
                        <div style={{ background: 'var(--bg3)', borderRadius: 6, padding: 12, fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{q.model_answer}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Project deep dive */}
            {result.projects_deep_dive?.length > 0 && (
              <div className="card">
                <SectionTitle>Project Deep Dive</SectionTitle>
                {result.projects_deep_dive.map((p, i) => (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: 'var(--accent2)' }}>{p.project}</div>
                    {p.expected_questions?.map((q, j) => (
                      <div key={j} style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, display: 'flex', gap: 8 }}>
                        <span style={{ color: 'var(--text3)' }}>Q:</span> {q}
                      </div>
                    ))}
                    {p.known_weaknesses?.length > 0 && (
                      <div style={{ marginTop: 8, padding: 10, background: '#450a0a20', borderRadius: 4 }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--red)' }}>WEAKNESS: </span>
                        <span style={{ fontSize: 12, color: 'var(--text2)' }}>{p.known_weaknesses[0]} → {p.how_to_defend}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Questions to ask */}
            {result.questions_to_ask_them?.length > 0 && (
              <div className="card">
                <SectionTitle>Questions to Ask Them</SectionTitle>
                {result.questions_to_ask_them.map((q, i) => (
                  <div key={i} style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8, display: 'flex', gap: 8 }}>
                    <span style={{ color: 'var(--accent2)' }}>{i+1}.</span> {q}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}