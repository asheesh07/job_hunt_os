import { useState } from 'react'
import { Mail, Copy, Check, Send } from 'lucide-react'
import { PageHeader, SectionTitle, RunButton } from './ui.jsx'

const MODES = [
  { id: 'connection-request', label: 'Connection Request', desc: 'LinkedIn connection note (300 chars)', endpoint: '/api/outreach/connection-request' },
  { id: 'hidden-job-enquiry', label: 'Hidden Job Enquiry', desc: 'Probe for unadvertised openings', endpoint: '/api/outreach/hidden-job-enquiry' },
  { id: 'post-application', label: 'Post Application', desc: 'Follow up after applying', endpoint: '/api/outreach/post-application' },
  { id: 'referral-ask', label: 'Referral Ask', desc: 'Request an internal referral', endpoint: '/api/outreach/referral-ask' },
  { id: 'founder', label: 'Founder Outreach', desc: 'Reach out directly to a founder', endpoint: '/api/outreach/founder' },
  { id: 'coffee-chat', label: 'Coffee Chat', desc: 'Request a 20-min informational call', endpoint: '/api/outreach/coffee-chat' },
]

const DEFAULT_FORMS = {
  'connection-request': { company: '', contact_name: '', contact_title: '', extra_context: '' },
  'hidden-job-enquiry': { company: '', contact_name: '', contact_title: '', role: '', extra_context: '' },
  'post-application':   { company: '', role: '', contact_name: '', contact_title: '', applied_date: '', extra_context: '' },
  'referral-ask':       { company: '', role: '', contact_name: '', relationship: '', contact_title: '', extra_context: '' },
  'founder':            { company: '', founder_name: '', founder_title: 'Co-founder/CEO', role: '', company_insight: '', extra_context: '' },
  'coffee-chat':        { company: '', contact_name: '', contact_title: '', topics: '', extra_context: '' },
}

export default function OutreachPanel() {
  const [mode, setMode]     = useState('connection-request')
  const [forms, setForms]   = useState(DEFAULT_FORMS)
  const [loading, setLoad]  = useState(false)
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState('')

  const form = forms[mode]
  const setField = (k, v) => setForms(f => ({ ...f, [mode]: { ...f[mode], [k]: v } }))

  const modeInfo = MODES.find(m => m.id === mode)

  async function run() {
    const payload = { ...form }
    if (!payload.company) return
    setLoad(true); setResult(null)
    try {
      const data = await fetch(modeInfo.endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(r => r.json())
      setResult(data)
    } finally { setLoad(false) }
  }

  function copy(text, key) {
    navigator.clipboard.writeText(text)
    setCopied(key); setTimeout(() => setCopied(''), 2000)
  }

  const CopyBtn = ({ text, id }) => (
    <button onClick={() => copy(text, id)} style={{
      background: 'none', border: '1px solid var(--border2)', borderRadius: 4,
      padding: '4px 10px', color: copied === id ? 'var(--green)' : 'var(--text3)',
      fontSize: 11, fontFamily: 'var(--mono)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
    }}>
      {copied === id ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
    </button>
  )

  const Field = ({ label, k, placeholder, textarea }) => (
    <div className="form-group">
      <label>{label}</label>
      {textarea
        ? <textarea value={form[k] || ''} onChange={e => setField(k, e.target.value)} placeholder={placeholder} style={{ minHeight: 80 }} />
        : <input value={form[k] || ''} onChange={e => setField(k, e.target.value)} placeholder={placeholder} />
      }
    </div>
  )

  const canRun = form.company && (
    mode === 'connection-request' ? form.contact_name :
    mode === 'referral-ask' ? form.contact_name && form.role :
    mode === 'founder' ? form.founder_name :
    mode === 'coffee-chat' ? form.contact_name :
    mode === 'post-application' ? form.role : true
  )

  return (
    <div className="fade-in">
      <PageHeader tag="Outreach Agent v2" title="Outreach Generator" desc="6 purpose-built outreach modes — each with its own strategy" />

      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {MODES.map(m => (
          <button key={m.id} onClick={() => { setMode(m.id); setResult(null) }} style={{
            padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
            border: mode === m.id ? '1px solid var(--accent2)' : '1px solid var(--border)',
            background: mode === m.id ? 'var(--accent2)' : 'var(--bg2)',
            color: mode === m.id ? '#000' : 'var(--text2)',
            fontWeight: mode === m.id ? 600 : 400,
          }}>{m.label}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>
        {/* Form */}
        <div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>{modeInfo.desc}</div>

          <Field label="Company *" k="company" placeholder="Sarvam.ai" />

          {mode === 'connection-request' && <>
            <Field label="Contact Name *" k="contact_name" placeholder="Vivek R" />
            <Field label="Contact Title" k="contact_title" placeholder="Head of Engineering" />
          </>}
          {mode === 'hidden-job-enquiry' && <>
            <Field label="Contact Name" k="contact_name" placeholder="Priya S" />
            <Field label="Contact Title" k="contact_title" placeholder="Tech Lead" />
            <Field label="Role of Interest" k="role" placeholder="AI Researcher" />
          </>}
          {mode === 'post-application' && <>
            <Field label="Role Applied For *" k="role" placeholder="AI Researcher" />
            <Field label="Contact Name" k="contact_name" placeholder="Recruiter name" />
            <Field label="Applied Date" k="applied_date" placeholder="Jan 15, 2025" />
          </>}
          {mode === 'referral-ask' && <>
            <Field label="Role *" k="role" placeholder="AI Researcher" />
            <Field label="Contact Name *" k="contact_name" placeholder="College batchmate" />
            <Field label="Relationship" k="relationship" placeholder="college batchmate / LinkedIn 2nd degree" />
            <Field label="Contact Title" k="contact_title" placeholder="SWE at the company" />
          </>}
          {mode === 'founder' && <>
            <Field label="Founder Name *" k="founder_name" placeholder="Vivek Raghunathan" />
            <Field label="Founder Title" k="founder_title" placeholder="Co-founder/CEO" />
            <Field label="Role of Interest" k="role" placeholder="AI Researcher" />
            <Field label="Company Insight" k="company_insight" placeholder="Recent launch, blog post, talk..." />
          </>}
          {mode === 'coffee-chat' && <>
            <Field label="Contact Name *" k="contact_name" placeholder="Meera K" />
            <Field label="Contact Title" k="contact_title" placeholder="Senior Researcher" />
            <Field label="Topics to Discuss" k="topics" placeholder="their LLM fine-tuning work, team culture..." />
          </>}

          <Field label="Extra Context" k="extra_context" placeholder="Any additional context..." textarea />

          <RunButton loading={loading} onClick={run} disabled={!canRun}>
            <Send size={12} /> Generate
          </RunButton>
        </div>

        {/* Results */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Quality score */}
            {result.quality_score && (
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 36, fontWeight: 800, fontFamily: 'var(--mono)', color: result.quality_score >= 80 ? 'var(--green)' : 'var(--yellow)' }}>
                    {result.quality_score}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase' }}>Quality</div>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{result.quality_notes}</p>
                  {result.send_timing && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text3)' }}>
                      Best time: <span style={{ color: 'var(--accent2)' }}>{result.send_timing.best_day} {result.send_timing.best_time}</span>
                      {result.send_timing.reasoning && ` — ${result.send_timing.reasoning}`}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Channel variants */}
            {result.channel_variants && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {result.channel_variants.linkedin_note?.text && (
                  <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div>
                        <SectionTitle>LinkedIn Note</SectionTitle>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: result.channel_variants.linkedin_note.char_count > 280 ? 'var(--red)' : 'var(--green)' }}>
                          {result.channel_variants.linkedin_note.char_count} / 300 chars
                        </span>
                      </div>
                      <CopyBtn text={result.channel_variants.linkedin_note.text} id="li_note" />
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{result.channel_variants.linkedin_note.text}</p>
                  </div>
                )}

                {result.channel_variants.email?.body && (
                  <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <SectionTitle>Email</SectionTitle>
                      <CopyBtn text={`Subject: ${result.channel_variants.email.subject}\n\n${result.channel_variants.email.body}`} id="email" />
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent2)', marginBottom: 8 }}>
                      Subject: {result.channel_variants.email.subject}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{result.channel_variants.email.body}</p>
                  </div>
                )}

                {result.channel_variants.linkedin_inmail?.body && (
                  <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <SectionTitle>LinkedIn InMail</SectionTitle>
                      <CopyBtn text={`Subject: ${result.channel_variants.linkedin_inmail.subject}\n\n${result.channel_variants.linkedin_inmail.body}`} id="inmail" />
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent2)', marginBottom: 8 }}>
                      Subject: {result.channel_variants.linkedin_inmail.subject}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{result.channel_variants.linkedin_inmail.body}</p>
                  </div>
                )}
              </div>
            )}

            {/* Follow-up sequence */}
            {result.follow_up_sequence?.length > 0 && (
              <div className="card">
                <SectionTitle>Follow-Up Sequence</SectionTitle>
                {result.follow_up_sequence.map((fu, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 12, paddingBottom: 12, borderBottom: i < result.follow_up_sequence.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent2)', width: 50, flexShrink: 0 }}>Day {fu.day}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                        <span className="tag tag-blue">{fu.channel}</span>
                        <span className="tag tag-purple">{fu.trigger}</span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, marginTop: 4 }}>{fu.message}</p>
                    </div>
                    <CopyBtn text={fu.message} id={`fu_${i}`} />
                  </div>
                ))}
              </div>
            )}

            {/* Dos and Don'ts */}
            {(result.dos?.length > 0 || result.donts?.length > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {result.dos?.length > 0 && (
                  <div className="card">
                    <SectionTitle>Do</SectionTitle>
                    {result.dos.map((d, i) => (
                      <div key={i} style={{ fontSize: 12, color: 'var(--green)', marginBottom: 6, display: 'flex', gap: 8 }}>
                        <span>✓</span> {d}
                      </div>
                    ))}
                  </div>
                )}
                {result.donts?.length > 0 && (
                  <div className="card">
                    <SectionTitle>Don't</SectionTitle>
                    {result.donts.map((d, i) => (
                      <div key={i} style={{ fontSize: 12, color: 'var(--red)', marginBottom: 6, display: 'flex', gap: 8 }}>
                        <span>✗</span> {d}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Personalization hooks */}
            {result.personalization_hooks?.length > 0 && (
              <div className="card">
                <SectionTitle>Personalization Hooks (Research Before Sending)</SectionTitle>
                {result.personalization_hooks.map((h, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6, display: 'flex', gap: 8 }}>
                    <span style={{ color: 'var(--accent2)' }}>→</span> {h}
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
