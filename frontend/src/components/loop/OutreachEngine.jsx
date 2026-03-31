import { useState } from 'react'
import { Send, Copy, Check, MessageSquare } from 'lucide-react'
import { PageHeader, SectionTitle, RunButton } from '../ui.jsx'

const MODES = [
  { id: 'cold_email',       label: 'Cold Email',         desc: 'Direct email to hiring manager or founder' },
  { id: 'connection_request', label: 'Connection Request', desc: 'LinkedIn note (300 chars)' },
  { id: 'hidden_job',       label: 'Hidden Job Enquiry',  desc: 'Probe for unadvertised openings' },
  { id: 'post_application', label: 'Post Application',    desc: 'Follow up after applying' },
  { id: 'referral_ask',     label: 'Referral Ask',        desc: 'Request an internal referral' },
  { id: 'founder_outreach', label: 'Founder Outreach',    desc: 'Reach out directly to a founder' },
  { id: 'coffee_chat',      label: 'Coffee Chat',         desc: 'Request a 20-min informational call' },
]

const RESPONSE_TYPES = [
  { id: 'positive',    label: 'They replied positively', color: 'var(--green)' },
  { id: 'negative',    label: 'Polite no',               color: '#d97706' },
  { id: 'no_response', label: 'No response',             color: 'var(--text3)' },
  { id: 'bounced',     label: 'Email bounced',           color: 'var(--red)' },
]

export default function OutreachEngine() {
  const [mode, setMode]         = useState('cold_email')
  const [form, setForm]         = useState({
    company: '', role: '', contact_name: '',
    contact_title: '', extra_context: '',
  })
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState(null)
  const [copied, setCopied]     = useState('')

  // Response recording state
  const [recordingId, setRecordingId]   = useState(null)
  const [responseType, setResponseType] = useState('')
  const [responseNotes, setResponseNotes] = useState('')
  const [recordLoading, setRecordLoading] = useState(false)
  const [recordDone, setRecordDone]     = useState(false)

  const modeInfo = MODES.find(m => m.id === mode)

  function setField(k, v) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function generate() {
    if (!form.company) return
    setLoading(true)
    setResult(null)
    setRecordingId(null)
    setRecordDone(false)
    try {
      const data = await fetch('/api/loop/outreach/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, mode }),
      }).then(r => r.json())
      setResult(data)
      if (data.outreach_id) setRecordingId(data.outreach_id)
    } finally {
      setLoading(false)
    }
  }

  async function recordResponse() {
    if (!recordingId || !responseType) return
    setRecordLoading(true)
    try {
      await fetch('/api/loop/outreach/record-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outreach_id: recordingId,
          response_type: responseType,
          notes: responseNotes,
        }),
      })
      setRecordDone(true)
    } finally {
      setRecordLoading(false)
    }
  }

  function copy(text, key) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const CopyBtn = ({ text, id }) => (
    <button
      onClick={() => copy(text, id)}
      style={{
        background: 'none', border: '1px solid var(--border2)',
        borderRadius: 4, padding: '4px 10px',
        color: copied === id ? 'var(--green)' : 'var(--text3)',
        fontSize: 11, fontFamily: 'var(--mono)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
      }}
    >
      {copied === id ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
    </button>
  )

  const canRun = !!form.company

  return (
    <div className="fade-in">
      <PageHeader
        tag="Outreach Engine — loop agent 3"
        title="Outreach Generator"
        desc="Messages calibrated to your historical response patterns. Every send is tracked."
      />

      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); setResult(null); setRecordDone(false) }}
            style={{
              padding: '6px 14px', borderRadius: 6,
              fontSize: 12, cursor: 'pointer',
              border: mode === m.id ? '1px solid var(--accent2)' : '1px solid var(--border)',
              background: mode === m.id ? 'var(--accent2)' : 'var(--bg2)',
              color: mode === m.id ? '#000' : 'var(--text2)',
              fontWeight: mode === m.id ? 600 : 400,
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>

        {/* Left — form */}
        <div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>
            {modeInfo.desc}
          </div>

          {[
            { label: 'Company *',       k: 'company',       placeholder: 'Sarvam.ai' },
            { label: 'Role',            k: 'role',          placeholder: 'AI Engineer' },
            { label: 'Contact name',    k: 'contact_name',  placeholder: 'Pratyush Mishra' },
            { label: 'Contact title',   k: 'contact_title', placeholder: 'Co-founder / CTO' },
          ].map(({ label, k, placeholder }) => (
            <div key={k} className="form-group">
              <label>{label}</label>
              <input
                value={form[k]}
                onChange={e => setField(k, e.target.value)}
                placeholder={placeholder}
              />
            </div>
          ))}

          <div className="form-group">
            <label>Extra context</label>
            <textarea
              value={form.extra_context}
              onChange={e => setField('extra_context', e.target.value)}
              placeholder="Recent company news, mutual connection, specific project to mention..."
              style={{ minHeight: 80 }}
            />
          </div>

          <RunButton loading={loading} onClick={generate} disabled={!canRun}>
            <Send size={12} /> Generate
          </RunButton>
        </div>

        {/* Right — results */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Calibration badge */}
            <div className="card" style={{
              display: 'flex', alignItems: 'center', gap: 16,
              borderLeft: `3px solid ${result.calibrated ? 'var(--green)' : 'var(--border2)'}`,
              borderRadius: '0 8px 8px 0',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
                  color: result.calibrated ? 'var(--green)' : 'var(--text3)',
                  marginBottom: 4,
                }}>
                  {result.calibrated
                    ? '✓ Calibrated to your winning patterns'
                    : '◦ Default generation — no pattern data yet'}
                </div>
                {result.patterns_applied?.length > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.5 }}>
                    Applied: {result.patterns_applied.join(' · ')}
                  </div>
                )}
                {!result.calibrated && (
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                    Log 5+ outreach responses to unlock pattern calibration
                  </div>
                )}
              </div>
              {result.outreach_id && (
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 10,
                  color: 'var(--text3)', textAlign: 'right', flexShrink: 0,
                }}>
                  tracking id<br />
                  <span style={{ color: 'var(--accent2)' }}>{result.outreach_id}</span>
                </div>
              )}
            </div>

            {/* Quality score */}
            {result.quality_score && (
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{
                    fontSize: 36, fontWeight: 800,
                    fontFamily: 'var(--mono)',
                    color: result.quality_score >= 80 ? 'var(--green)' : '#d97706',
                  }}>
                    {result.quality_score}
                  </div>
                  <div style={{
                    fontFamily: 'var(--mono)', fontSize: 10,
                    color: 'var(--text3)', textTransform: 'uppercase',
                  }}>
                    Quality
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
                    {result.quality_notes}
                  </p>
                  {result.send_timing && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text3)' }}>
                      Best time:{' '}
                      <span style={{ color: 'var(--accent2)' }}>
                        {result.send_timing.best_day} {result.send_timing.best_time}
                      </span>
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
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', marginBottom: 10,
                    }}>
                      <div>
                        <SectionTitle>LinkedIn note</SectionTitle>
                        <span style={{
                          fontFamily: 'var(--mono)', fontSize: 10,
                          color: result.channel_variants.linkedin_note.char_count > 280
                            ? 'var(--red)' : 'var(--green)',
                        }}>
                          {result.channel_variants.linkedin_note.char_count} / 300 chars
                        </span>
                      </div>
                      <CopyBtn text={result.channel_variants.linkedin_note.text} id="li_note" />
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
                      {result.channel_variants.linkedin_note.text}
                    </p>
                  </div>
                )}

                {result.channel_variants.email?.body && (
                  <div className="card">
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', marginBottom: 10,
                    }}>
                      <SectionTitle>Email</SectionTitle>
                      <CopyBtn
                        text={`Subject: ${result.channel_variants.email.subject}\n\n${result.channel_variants.email.body}`}
                        id="email"
                      />
                    </div>
                    <div style={{
                      fontFamily: 'var(--mono)', fontSize: 11,
                      color: 'var(--accent2)', marginBottom: 8,
                    }}>
                      Subject: {result.channel_variants.email.subject}
                    </div>
                    <p style={{
                      fontSize: 13, color: 'var(--text2)',
                      lineHeight: 1.7, whiteSpace: 'pre-wrap',
                    }}>
                      {result.channel_variants.email.body}
                    </p>
                  </div>
                )}

                {result.channel_variants.linkedin_inmail?.body && (
                  <div className="card">
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', marginBottom: 10,
                    }}>
                      <SectionTitle>LinkedIn InMail</SectionTitle>
                      <CopyBtn
                        text={`Subject: ${result.channel_variants.linkedin_inmail.subject}\n\n${result.channel_variants.linkedin_inmail.body}`}
                        id="inmail"
                      />
                    </div>
                    <div style={{
                      fontFamily: 'var(--mono)', fontSize: 11,
                      color: 'var(--accent2)', marginBottom: 8,
                    }}>
                      Subject: {result.channel_variants.linkedin_inmail.subject}
                    </div>
                    <p style={{
                      fontSize: 13, color: 'var(--text2)',
                      lineHeight: 1.7, whiteSpace: 'pre-wrap',
                    }}>
                      {result.channel_variants.linkedin_inmail.body}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Follow-up sequence */}
            {result.follow_up_sequence?.length > 0 && (
              <div className="card">
                <SectionTitle>Follow-up sequence</SectionTitle>
                {result.follow_up_sequence.map((fu, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 14, marginBottom: 12,
                    paddingBottom: 12,
                    borderBottom: i < result.follow_up_sequence.length - 1
                      ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{
                      fontFamily: 'var(--mono)', fontSize: 11,
                      color: 'var(--accent2)', width: 50, flexShrink: 0,
                    }}>
                      Day {fu.day}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                        <span className="tag tag-blue">{fu.channel}</span>
                        <span className="tag tag-purple">{fu.trigger}</span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, marginTop: 4 }}>
                        {fu.message}
                      </p>
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
                      <div key={i} style={{
                        fontSize: 12, color: 'var(--green)',
                        marginBottom: 6, display: 'flex', gap: 8,
                      }}>
                        <span>✓</span> {d}
                      </div>
                    ))}
                  </div>
                )}
                {result.donts?.length > 0 && (
                  <div className="card">
                    <SectionTitle>Don't</SectionTitle>
                    {result.donts.map((d, i) => (
                      <div key={i} style={{
                        fontSize: 12, color: 'var(--red)',
                        marginBottom: 6, display: 'flex', gap: 8,
                      }}>
                        <span>✗</span> {d}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Record response — the loop closer */}
            {recordingId && (
              <div className="card" style={{
                borderLeft: `3px solid ${recordDone ? 'var(--green)' : 'var(--accent2)'}`,
                borderRadius: '0 8px 8px 0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <MessageSquare size={14} color="var(--accent2)" />
                  <div style={{
                    fontFamily: 'var(--mono)', fontSize: 11,
                    color: 'var(--accent2)', fontWeight: 700,
                  }}>
                    {recordDone ? '✓ Response recorded — loop updated' : 'Record response when you hear back'}
                  </div>
                </div>

                {!recordDone && (
                  <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                      {RESPONSE_TYPES.map(rt => (
                        <button
                          key={rt.id}
                          onClick={() => setResponseType(rt.id)}
                          style={{
                            padding: '5px 12px', borderRadius: 5,
                            fontSize: 11, cursor: 'pointer',
                            fontFamily: 'var(--mono)',
                            border: responseType === rt.id
                              ? `1px solid ${rt.color}`
                              : '1px solid var(--border)',
                            background: responseType === rt.id
                              ? rt.color + '22'
                              : 'var(--bg2)',
                            color: responseType === rt.id ? rt.color : 'var(--text3)',
                            fontWeight: responseType === rt.id ? 600 : 400,
                          }}
                        >
                          {rt.label}
                        </button>
                      ))}
                    </div>

                    <div className="form-group" style={{ marginBottom: 10 }}>
                      <label>Notes (optional)</label>
                      <input
                        value={responseNotes}
                        onChange={e => setResponseNotes(e.target.value)}
                        placeholder="They asked for a portfolio, referred me to their CTO..."
                      />
                    </div>

                    <button
                      disabled={!responseType || recordLoading}
                      onClick={recordResponse}
                      style={{
                        padding: '8px 18px', borderRadius: 6,
                        fontSize: 12, cursor: responseType ? 'pointer' : 'not-allowed',
                        border: '1px solid var(--accent2)',
                        background: responseType ? 'var(--accent2)' : 'var(--bg2)',
                        color: responseType ? '#000' : 'var(--text3)',
                        fontWeight: 600, fontFamily: 'var(--mono)',
                        opacity: recordLoading ? 0.6 : 1,
                      }}
                    >
                      {recordLoading ? 'Recording…' : 'Record + Update Loop'}
                    </button>

                    <div style={{
                      marginTop: 8, fontSize: 11, color: 'var(--text3)',
                      fontFamily: 'var(--mono)',
                    }}>
                      This updates the outreach pattern model and recalibrates future messages
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}