import { useState, useEffect } from 'react'
import { Settings, Save, RotateCcw } from 'lucide-react'
import { PageHeader, SectionTitle } from './ui.jsx'

export default function SettingsPage() {
  const [profile, setProfile] = useState(null)
  const [saved, setSaved]     = useState(false)
  const [loading, setLoad]    = useState(false)

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(setProfile).catch(() => {})
  }, [])

  async function save() {
    setLoad(true)
    await fetch('/api/profile', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    })
    setLoad(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!profile) return <div style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 13 }}>Loading profile...</div>

  const F = ({ label, field, multiline, placeholder, rows }) => (
    <div className="form-group">
      <label>{label}</label>
      {multiline ? (
        <textarea
          value={profile[field] || ''}
          onChange={e => setProfile(p => ({...p, [field]: e.target.value}))}
          placeholder={placeholder}
          style={{ minHeight: rows ? rows * 22 : 80 }}
        />
      ) : (
        <input
          value={profile[field] || ''}
          onChange={e => setProfile(p => ({...p, [field]: e.target.value}))}
          placeholder={placeholder}
        />
      )}
    </div>
  )

  return (
    <div className="fade-in">
      <PageHeader tag="Settings" title="Profile & Settings" desc="Your background is injected into every agent automatically" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 960 }}>

        {/* Identity */}
        <div className="card">
          <SectionTitle>Identity</SectionTitle>
          <F label="Full Name"   field="name"     placeholder="Asheesh" />
          <F label="Email"       field="email"    placeholder="you@gmail.com" />
          <F label="Phone"       field="phone"    placeholder="+91-XXXXXXXXXX" />
          <F label="Location"    field="location" placeholder="Hyderabad, India" />
          <F label="LinkedIn"    field="linkedin" placeholder="linkedin.com/in/username" />
          <F label="GitHub"      field="github"   placeholder="github.com/username" />
        </div>

        {/* Resume */}
        <div className="card">
          <SectionTitle>Resume Summary</SectionTitle>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
            Used by Resume, Outreach, and Interview agents. Keep it dense and keyword-rich.
          </p>
          <F label="Resume Text" field="resume_text" multiline placeholder="Paste condensed resume here..." rows={10} />
        </div>

        {/* Education & Skills */}
        <div className="card">
          <SectionTitle>Education</SectionTitle>
          <F label="Education" field="education" multiline rows={4} placeholder="B.Tech CS, SR University, GPA 9.05..." />
          <SectionTitle>Skills</SectionTitle>
          <F label="Skills" field="skills" multiline rows={5} placeholder="Python, PyTorch, LLMs..." />
        </div>

        {/* Projects */}
        <div className="card">
          <SectionTitle>Projects</SectionTitle>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
            Interview agent uses this to generate project-specific questions and answers.
          </p>
          <F label="Projects" field="projects" multiline rows={10} placeholder="1. Dia Legal...\n2. EAAD..." />
        </div>

        {/* Job preferences */}
        <div className="card">
          <SectionTitle>Job Preferences</SectionTitle>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>Used by Job Scout for daily digest.</p>
          <div className="form-group">
            <label>Roles</label>
            <input
              value={profile.job_preferences?.roles || ''}
              onChange={e => setProfile(p => ({...p, job_preferences: {...(p.job_preferences||{}), roles: e.target.value}}))}
              placeholder="AI Researcher, Research Engineer, ML Engineer"
            />
          </div>
          <div className="form-group">
            <label>Locations</label>
            <input
              value={profile.job_preferences?.locations || ''}
              onChange={e => setProfile(p => ({...p, job_preferences: {...(p.job_preferences||{}), locations: e.target.value}}))}
              placeholder="Bengaluru, Hyderabad, Remote"
            />
          </div>
          <div className="form-group">
            <label>Salary Range</label>
            <input
              value={profile.job_preferences?.salary_range || ''}
              onChange={e => setProfile(p => ({...p, job_preferences: {...(p.job_preferences||{}), salary_range: e.target.value}}))}
              placeholder="8–20 LPA"
            />
          </div>
          <div className="form-group">
            <label>Keywords</label>
            <input
              value={profile.job_preferences?.keywords || ''}
              onChange={e => setProfile(p => ({...p, job_preferences: {...(p.job_preferences||{}), keywords: e.target.value}}))}
              placeholder="LLM, autonomous agents, NLP"
            />
          </div>
        </div>

        {/* Digest */}
        <div className="card">
          <SectionTitle>Daily Digest Email</SectionTitle>
          <F label="Digest Email" field="digest_email" placeholder="where to send daily job digest" />
          <div className="form-group">
            <label>Digest Active</label>
            <select
              value={profile.digest_subscribed ? 'true' : 'false'}
              onChange={e => setProfile(p => ({...p, digest_subscribed: e.target.value === 'true'}))}
            >
              <option value="true">Subscribed — send daily at 8 AM</option>
              <option value="false">Unsubscribed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 220, right: 0,
        background: 'var(--bg2)', borderTop: '1px solid var(--border)',
        padding: '14px 36px', display: 'flex', alignItems: 'center', gap: 12, zIndex: 50,
      }}>
        <button className="btn btn-primary" onClick={save} disabled={loading}>
          <Save size={12} /> {saved ? '✓ Saved' : loading ? 'Saving...' : 'Save Profile'}
        </button>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)' }}>
          Profile saved to disk. All agents use this automatically.
        </span>
      </div>

      <div style={{ height: 60 }} />
    </div>
  )
}