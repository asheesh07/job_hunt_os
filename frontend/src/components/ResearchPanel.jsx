// ResearchPanel.jsx
import { useState } from 'react'
import { Search, Building2, User, Target, Package } from 'lucide-react'
import { PageHeader, SectionTitle, RunButton } from './ui.jsx'

const TABS = [
  { id: 'company', label: 'Company Intel', icon: Building2, desc: 'Full company intelligence report' },
  { id: 'why-this-company', label: 'Why This Company', icon: Target, desc: 'Personalized "Why do you want to work here?" answers' },
  { id: 'person', label: 'Person Intel', icon: User, desc: 'Research a specific person for outreach' },
  { id: 'outreach-kit', label: 'Outreach Kit', icon: Package, desc: 'Full personalization kit — emails, hooks, talking points' },
]

export function ResearchPanel() {
  const [tab, setTab]       = useState('company')
  const [loading, setLoad]  = useState(false)
  const [result, setResult] = useState(null)

  // Per-tab form state
  const [companyForm, setCompanyForm] = useState({ company: '', role: '' })
  const [whyForm, setWhyForm]         = useState({ company: '', role: '', jd: '' })
  const [personForm, setPersonForm]   = useState({ person_name: '', company: '', person_title: '', linkedin_url: '' })
  const [kitForm, setKitForm]         = useState({ company: '', person_name: '', person_title: '', role: '', outreach_mode: 'cold_email' })

  async function run() {
    setLoad(true); setResult(null)
    try {
      let endpoint, payload
      if (tab === 'company') {
        if (!companyForm.company.trim()) return
        endpoint = '/api/research/company'
        payload  = companyForm
      } else if (tab === 'why-this-company') {
        if (!whyForm.company.trim()) return
        endpoint = '/api/research/why-this-company'
        payload  = whyForm
      } else if (tab === 'person') {
        if (!personForm.person_name.trim() || !personForm.company.trim()) return
        endpoint = '/api/research/person'
        payload  = personForm
      } else {
        if (!kitForm.company.trim()) return
        endpoint = '/api/research/outreach-kit'
        payload  = kitForm
      }
      const data = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(r => r.json())
      setResult(data)
    } finally { setLoad(false) }
  }

  const canRun = tab === 'company' ? companyForm.company.trim() :
                 tab === 'why-this-company' ? whyForm.company.trim() :
                 tab === 'person' ? personForm.person_name.trim() && personForm.company.trim() :
                 kitForm.company.trim()

  return (
    <div className="fade-in">
      <PageHeader tag="Research Agent v2" title="Company Research" desc="Deep intel — company, people, why-this-company, outreach kit" />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>
        {/* Forms */}
        <div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>{TABS.find(t => t.id === tab)?.desc}</div>

          {tab === 'company' && <>
            <div className="form-group"><label>Company *</label><input value={companyForm.company} onChange={e => setCompanyForm(f => ({...f, company: e.target.value}))} placeholder="Sarvam.ai" /></div>
            <div className="form-group"><label>Role (optional)</label><input value={companyForm.role} onChange={e => setCompanyForm(f => ({...f, role: e.target.value}))} placeholder="AI Researcher" /></div>
          </>}

          {tab === 'why-this-company' && <>
            <div className="form-group"><label>Company *</label><input value={whyForm.company} onChange={e => setWhyForm(f => ({...f, company: e.target.value}))} placeholder="Sarvam.ai" /></div>
            <div className="form-group"><label>Role</label><input value={whyForm.role} onChange={e => setWhyForm(f => ({...f, role: e.target.value}))} placeholder="AI Researcher" /></div>
            <div className="form-group"><label>Job Description (optional)</label><textarea value={whyForm.jd} onChange={e => setWhyForm(f => ({...f, jd: e.target.value}))} placeholder="Paste JD for more specificity..." style={{ minHeight: 120 }} /></div>
          </>}

          {tab === 'person' && <>
            <div className="form-group"><label>Person Name *</label><input value={personForm.person_name} onChange={e => setPersonForm(f => ({...f, person_name: e.target.value}))} placeholder="Vivek Raghunathan" /></div>
            <div className="form-group"><label>Company *</label><input value={personForm.company} onChange={e => setPersonForm(f => ({...f, company: e.target.value}))} placeholder="Sarvam.ai" /></div>
            <div className="form-group"><label>Title</label><input value={personForm.person_title} onChange={e => setPersonForm(f => ({...f, person_title: e.target.value}))} placeholder="Head of Engineering" /></div>
            <div className="form-group"><label>LinkedIn URL</label><input value={personForm.linkedin_url} onChange={e => setPersonForm(f => ({...f, linkedin_url: e.target.value}))} placeholder="linkedin.com/in/..." /></div>
          </>}

          {tab === 'outreach-kit' && <>
            <div className="form-group"><label>Company *</label><input value={kitForm.company} onChange={e => setKitForm(f => ({...f, company: e.target.value}))} placeholder="Sarvam.ai" /></div>
            <div className="form-group"><label>Contact Person</label><input value={kitForm.person_name} onChange={e => setKitForm(f => ({...f, person_name: e.target.value}))} placeholder="Vivek R" /></div>
            <div className="form-group"><label>Contact Title</label><input value={kitForm.person_title} onChange={e => setKitForm(f => ({...f, person_title: e.target.value}))} placeholder="Head of Engineering" /></div>
            <div className="form-group"><label>Role</label><input value={kitForm.role} onChange={e => setKitForm(f => ({...f, role: e.target.value}))} placeholder="AI Researcher" /></div>
            <div className="form-group">
              <label>Outreach Mode</label>
              <select value={kitForm.outreach_mode} onChange={e => setKitForm(f => ({...f, outreach_mode: e.target.value}))}
                style={{ width: '100%', padding: '8px 10px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 6, color: 'var(--text1)', fontSize: 13 }}>
                <option value="cold_email">Cold Email</option>
                <option value="connection_request">Connection Request</option>
                <option value="coffee_chat">Coffee Chat</option>
                <option value="founder">Founder Outreach</option>
              </select>
            </div>
          </>}

          <RunButton loading={loading} onClick={run} disabled={!canRun}>
            <Search size={12} /> Research
          </RunButton>
        </div>

        {/* Results */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {tab === 'company' && <CompanyResults data={result} />}
            {tab === 'why-this-company' && <WhyResults data={result} />}
            {tab === 'person' && <PersonResults data={result} />}
            {tab === 'outreach-kit' && <KitResults data={result} />}
          </div>
        )}
      </div>
    </div>
  )
}

function CompanyResults({ data }) {
  return <>
    {data.company_overview && (
      <div className="card">
        <SectionTitle>Overview</SectionTitle>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 10 }}>{data.company_overview}</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[data.size, data.funding, data.founded].filter(Boolean).map((t, i) => (
            <span key={i} className="tag tag-purple">{t}</span>
          ))}
        </div>
      </div>
    )}
    {data.tech_stack?.length > 0 && <TagCard title="Tech Stack" items={data.tech_stack} cls="tag-blue" />}
    {data.what_they_look_for?.length > 0 && <TagCard title="What They Look For" items={data.what_they_look_for} cls="tag-purple" />}
    {data.interview_process && (
      <div className="card">
        <SectionTitle>Interview Process</SectionTitle>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <span className="tag tag-yellow">{data.interview_process.difficulty}</span>
          {data.interview_process.rounds?.map((r, i) => <span key={i} className="tag tag-blue">Round {i+1}: {r}</span>)}
        </div>
        {data.interview_process.focus_areas?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {data.interview_process.focus_areas.map((f, i) => <span key={i} className="tag tag-cyan">{f}</span>)}
          </div>
        )}
      </div>
    )}
    {data.engineering_culture && (
      <div className="card">
        <SectionTitle>Engineering Culture</SectionTitle>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{data.engineering_culture}</p>
      </div>
    )}
    {(data.green_flags?.length > 0 || data.red_flags?.length > 0) && (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {data.green_flags?.length > 0 && (
          <div className="card">
            <SectionTitle>Green Flags</SectionTitle>
            {data.green_flags.map((f, i) => <div key={i} style={{ fontSize: 12, color: 'var(--green)', marginBottom: 4 }}>✓ {f}</div>)}
          </div>
        )}
        {data.red_flags?.length > 0 && (
          <div className="card">
            <SectionTitle>Red Flags</SectionTitle>
            {data.red_flags.map((f, i) => <div key={i} style={{ fontSize: 12, color: 'var(--red)', marginBottom: 4 }}>⚠ {f}</div>)}
          </div>
        )}
      </div>
    )}
    {data.talking_points?.length > 0 && <TagCard title="Talking Points" items={data.talking_points} cls="tag-green" />}
    {data.questions_to_ask?.length > 0 && <TagCard title="Questions to Ask Them" items={data.questions_to_ask} cls="tag-cyan" />}
    {data.recent_news?.length > 0 && (
      <div className="card">
        <SectionTitle>Recent News</SectionTitle>
        {data.recent_news.map((n, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{n.headline}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{n.relevance}</div>
          </div>
        ))}
      </div>
    )}
  </>
}

function WhyResults({ data }) {
  const [copied, setCopied] = useState('')
  const copy = (text, key) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 2000) }

  return <>
    {data.interview_answer && (
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <SectionTitle>Interview Answer (2-3 para)</SectionTitle>
          <button onClick={() => copy(data.interview_answer, 'interview')} style={{ background: 'none', border: '1px solid var(--border2)', borderRadius: 4, padding: '4px 10px', color: copied === 'interview' ? 'var(--green)' : 'var(--text3)', fontSize: 11, cursor: 'pointer' }}>
            {copied === 'interview' ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{data.interview_answer}</p>
      </div>
    )}
    {data.email_hook && (
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <SectionTitle>Email Hook</SectionTitle>
          <button onClick={() => copy(data.email_hook, 'email')} style={{ background: 'none', border: '1px solid var(--border2)', borderRadius: 4, padding: '4px 10px', color: copied === 'email' ? 'var(--green)' : 'var(--text3)', fontSize: 11, cursor: 'pointer' }}>
            {copied === 'email' ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{data.email_hook}</p>
      </div>
    )}
    {data.linkedin_note_hook && (
      <div className="card">
        <SectionTitle>LinkedIn Note Hook</SectionTitle>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{data.linkedin_note_hook}</p>
      </div>
    )}
    {data.key_overlaps?.length > 0 && (
      <div className="card">
        <SectionTitle>Key Overlaps (Your Work ↔ Their Work)</SectionTitle>
        {data.key_overlaps.map((o, i) => (
          <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: i < data.key_overlaps.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 12 }}>
              <span style={{ color: 'var(--accent2)', minWidth: 100 }}>Your work:</span>
              <span style={{ color: 'var(--text2)' }}>{o.candidate_work}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 12 }}>
              <span style={{ color: 'var(--text3)', minWidth: 100 }}>Their work:</span>
              <span style={{ color: 'var(--text2)' }}>{o.company_work}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 4 }}>→ {o.connection}</div>
          </div>
        ))}
      </div>
    )}
    {data.specific_hooks?.length > 0 && <TagCard title="Specific Hooks to Reference" items={data.specific_hooks} cls="tag-cyan" />}
    {data.what_to_avoid?.length > 0 && (
      <div className="card">
        <SectionTitle>What to Avoid</SectionTitle>
        {data.what_to_avoid.map((w, i) => <div key={i} style={{ fontSize: 12, color: 'var(--red)', marginBottom: 4 }}>✗ {w}</div>)}
      </div>
    )}
  </>
}

function PersonResults({ data }) {
  return <>
    {data.person_background && (
      <div className="card">
        <SectionTitle>Background</SectionTitle>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{data.person_background}</p>
        {data.best_channel && (
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <span className="tag tag-green">Best: {data.best_channel}</span>
            <span className="tag tag-blue">{data.connection_strength}</span>
          </div>
        )}
      </div>
    )}
    {data.personalization_hooks?.length > 0 && (
      <div className="card">
        <SectionTitle>Personalization Hooks</SectionTitle>
        {data.personalization_hooks.map((h, i) => (
          <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: i < data.personalization_hooks.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{h.hook}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Source: {h.source}</div>
            <div style={{ fontSize: 12, color: 'var(--accent2)', marginTop: 4, fontStyle: 'italic' }}>"{h.how_to_use}"</div>
          </div>
        ))}
      </div>
    )}
    {data.shared_interests?.length > 0 && (
      <div className="card">
        <SectionTitle>Shared Interests</SectionTitle>
        {data.shared_interests.map((s, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <span className="tag tag-purple">{s.interest}</span>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>{s.candidate_angle}</div>
          </div>
        ))}
      </div>
    )}
    {data.what_resonates && (
      <div className="card">
        <SectionTitle>What Resonates</SectionTitle>
        <p style={{ fontSize: 13, color: 'var(--text2)' }}>{data.what_resonates}</p>
      </div>
    )}
    {data.what_to_avoid?.length > 0 && (
      <div className="card">
        <SectionTitle>What to Avoid</SectionTitle>
        {data.what_to_avoid.map((w, i) => <div key={i} style={{ fontSize: 12, color: 'var(--red)', marginBottom: 4 }}>✗ {w}</div>)}
      </div>
    )}
  </>
}

function KitResults({ data }) {
  const [copied, setCopied] = useState('')
  const copy = (text, key) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 2000) }

  return <>
    {data.assembled_email && (
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <SectionTitle>Assembled Email (Ready to Send)</SectionTitle>
          <button onClick={() => copy(data.assembled_email, 'email')} style={{ background: 'none', border: '1px solid var(--border2)', borderRadius: 4, padding: '4px 10px', color: copied === 'email' ? 'var(--green)' : 'var(--text3)', fontSize: 11, cursor: 'pointer' }}>
            {copied === 'email' ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{data.assembled_email}</p>
      </div>
    )}
    {data.assembled_linkedin_note && (
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <SectionTitle>LinkedIn Note</SectionTitle>
          <button onClick={() => copy(data.assembled_linkedin_note, 'li')} style={{ background: 'none', border: '1px solid var(--border2)', borderRadius: 4, padding: '4px 10px', color: copied === 'li' ? 'var(--green)' : 'var(--text3)', fontSize: 11, cursor: 'pointer' }}>
            {copied === 'li' ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{data.assembled_linkedin_note}</p>
      </div>
    )}
    {data.subject_lines?.length > 0 && (
      <div className="card">
        <SectionTitle>Subject Line Options</SectionTitle>
        {data.subject_lines.map((s, i) => (
          <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: i < data.subject_lines.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent2)' }}>{s.subject}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{s.reasoning}</div>
          </div>
        ))}
      </div>
    )}
    {data.opening_hooks?.length > 0 && (
      <div className="card">
        <SectionTitle>Opening Hooks</SectionTitle>
        {data.opening_hooks.map((h, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13, color: 'var(--text2)', fontStyle: 'italic' }}>"{h.hook}"</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{h.why_it_works}</div>
          </div>
        ))}
      </div>
    )}
    {data.what_to_avoid?.length > 0 && (
      <div className="card">
        <SectionTitle>What to Avoid</SectionTitle>
        {data.what_to_avoid.map((w, i) => <div key={i} style={{ fontSize: 12, color: 'var(--red)', marginBottom: 4 }}>✗ {w}</div>)}
      </div>
    )}
  </>
}

function TagCard({ title, items, cls }) {
  return (
    <div className="card">
      <SectionTitle>{title}</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {(items || []).map((t, i) => <span key={i} className={`tag ${cls}`}>{t}</span>)}
      </div>
    </div>
  )
}

export default ResearchPanel
