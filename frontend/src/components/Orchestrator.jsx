import { useState, useRef, useEffect } from 'react'
import { Terminal, Send, ChevronRight } from 'lucide-react'

const EXAMPLES = [
  'Research Sarvam.ai and prep me for an AI Researcher interview',
  'Tailor my resume for this JD: [paste job description]',
  'Write a cold email to the hiring manager at Krutrim for ML Engineer role',
  'What skills am I missing for a Research Engineer role at a LLM startup?',
  'Find AI/ML job openings in Bengaluru posted this week',
]

export default function Orchestrator() {
  const [messages, setMessages] = useState([
    {
      role: 'system',
      text: 'Job Hunt OS v1.0 — Multi-Agent Orchestrator\nType a task in natural language. I will route it to the right agents automatically.',
    }
  ])
  const [input, setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(m => [...m, { role: 'user', text: userMsg }])
    setLoading(true)

    try {
      const res = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'agent', data }])
    } catch (e) {
      setMessages(m => [...m, { role: 'error', text: 'Connection failed. Is the backend running?' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fade-in" style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent2)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
          ◆ Command Center
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Orchestrator</h1>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 4 }}>
          Natural language → automatic agent routing
        </p>
      </div>

      {/* Terminal */}
      <div className="card" style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        padding: 0, overflow: 'hidden',
        fontFamily: 'var(--mono)',
      }}>
        {/* Terminal header */}
        <div style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg3)',
        }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#eab308' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ color: 'var(--text3)', fontSize: 11, marginLeft: 8 }}>
            job-hunt-os — orchestrator
          </span>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map((msg, i) => (
            <div key={i}>
              {msg.role === 'system' && (
                <div style={{ color: 'var(--text3)', fontSize: 12, whiteSpace: 'pre-line', lineHeight: 1.7 }}>
                  {msg.text}
                </div>
              )}
              {msg.role === 'user' && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--green)', flexShrink: 0 }}>❯</span>
                  <span style={{ color: 'var(--text)', fontSize: 13 }}>{msg.text}</span>
                </div>
              )}
              {msg.role === 'agent' && <AgentResult data={msg.data} />}
              {msg.role === 'error' && (
                <div style={{ color: 'var(--red)', fontSize: 12 }}>✗ {msg.text}</div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="spinner" />
              <span style={{ color: 'var(--text3)', fontSize: 12 }}>Routing to agents...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg3)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ color: 'var(--accent2)', fontSize: 14 }}>❯</span>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Type a task... (Enter to run)"
              style={{
                flex: 1, background: 'transparent', border: 'none',
                color: 'var(--text)', fontSize: 13,
                outline: 'none', fontFamily: 'var(--mono)',
              }}
              autoFocus
            />
            <button className="btn btn-primary" onClick={send} disabled={loading} style={{ padding: '6px 12px' }}>
              <Send size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Examples */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
          Example prompts
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {EXAMPLES.map((ex, i) => (
            <button key={i} onClick={() => setInput(ex)} style={{
              background: 'var(--bg3)', border: '1px solid var(--border2)',
              borderRadius: 4, padding: '5px 10px',
              color: 'var(--text3)', fontSize: 11,
              fontFamily: 'var(--mono)', cursor: 'pointer',
              transition: 'all 0.15s', textAlign: 'left',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent2)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.borderColor = 'var(--border2)' }}
            >
              <ChevronRight size={10} style={{ display: 'inline', marginRight: 4 }} />
              {ex.slice(0, 50)}{ex.length > 50 ? '...' : ''}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function AgentResult({ data }) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ borderLeft: '2px solid var(--accent)', paddingLeft: 14, marginTop: 4 }}>
      <div
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ color: 'var(--accent2)', fontSize: 12 }}>
          {open ? '▾' : '▸'} agents_run: [{data.agents_run?.join(', ')}]
        </span>
        <span style={{ color: 'var(--text3)', fontSize: 11 }}>— {data.intent}</span>
      </div>
      {open && (
        <pre style={{
          fontSize: 11, color: 'var(--text2)',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          maxHeight: 400, overflowY: 'auto',
          background: 'var(--bg3)', padding: 12, borderRadius: 6,
        }}>
          {JSON.stringify(data.results, null, 2)}
        </pre>
      )}
    </div>
  )
}