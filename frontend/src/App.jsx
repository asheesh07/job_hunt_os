import { useState, useEffect, useRef } from "react";

const style = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500;600&display=swap');

  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

  :root {
    --bg-from: #0f0c29;
    --bg-mid:  #302b63;
    --bg-to:   #24243e;
    --glass:   rgba(255,255,255,0.06);
    --glass2:  rgba(255,255,255,0.10);
    --glass3:  rgba(255,255,255,0.15);
    --border:  rgba(255,255,255,0.10);
    --border2: rgba(255,255,255,0.18);
    --accent:  #a78bfa;
    --a2:      #c4b5fd;
    --a3:      #ede9fe;
    --green:   #6ee7b7;
    --yellow:  #fcd34d;
    --red:     #fca5a5;
    --blue:    #93c5fd;
    --cyan:    #67e8f9;
    --pink:    #f9a8d4;
    --text:    rgba(255,255,255,0.92);
    --text2:   rgba(255,255,255,0.60);
    --text3:   rgba(255,255,255,0.30);
    --mono:    'JetBrains Mono', monospace;
    --sans:    'Outfit', sans-serif;
    --blur:    blur(20px);
    --blur2:   blur(40px);
    --rad:     14px;
    --rad2:    10px;
    --rad3:    6px;
  }

  html, body { height:100%; }
  body {
    font-family: var(--sans);
    color: var(--text);
    background: linear-gradient(135deg, var(--bg-from) 0%, var(--bg-mid) 50%, var(--bg-to) 100%);
    background-attachment: fixed;
    min-height: 100vh;
    overflow-x: hidden;
  }

  /* Animated mesh background */
  body::before {
    content:'';
    position:fixed; inset:0; z-index:0;
    background:
      radial-gradient(ellipse 80% 60% at 20% 20%, rgba(167,139,250,0.15) 0%, transparent 60%),
      radial-gradient(ellipse 60% 80% at 80% 80%, rgba(103,232,249,0.10) 0%, transparent 60%),
      radial-gradient(ellipse 50% 50% at 50% 50%, rgba(249,168,212,0.08) 0%, transparent 70%);
    pointer-events:none;
    animation: meshShift 12s ease-in-out infinite alternate;
  }

  @keyframes meshShift {
    0%   { opacity:1; transform:scale(1); }
    100% { opacity:0.7; transform:scale(1.05); }
  }

  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:var(--border2); border-radius:4px; }

  @keyframes fadeUp   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin     { to{transform:rotate(360deg)} }
  @keyframes pulse    { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.8)} }
  @keyframes shimmer  { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
  @keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }

  .fade-up { animation: fadeUp 0.4s cubic-bezier(.22,1,.36,1) forwards; }

  .spinner {
    width:15px; height:15px;
    border:2px solid rgba(255,255,255,0.15);
    border-top-color:var(--accent);
    border-radius:50%;
    animation:spin .7s linear infinite;
    display:inline-block; flex-shrink:0;
  }

  .pulse-dot {
    width:7px; height:7px; border-radius:50%;
    background:var(--green);
    animation:pulse 2.5s ease-in-out infinite;
    box-shadow: 0 0 8px var(--green);
  }

  /* Glass card */
  .glass {
    background: var(--glass);
    backdrop-filter: var(--blur);
    -webkit-backdrop-filter: var(--blur);
    border: 1px solid var(--border);
    border-radius: var(--rad);
    transition: border-color .2s, background .2s, box-shadow .2s;
  }
  .glass:hover {
    border-color: var(--border2);
    background: var(--glass2);
    box-shadow: 0 8px 40px rgba(0,0,0,0.25);
  }

  .glass-deep {
    background: rgba(255,255,255,0.03);
    backdrop-filter: var(--blur2);
    -webkit-backdrop-filter: var(--blur2);
    border: 1px solid var(--border);
    border-radius: var(--rad);
  }

  /* Buttons */
  .btn {
    font-family:var(--mono); font-size:11px; font-weight:600;
    letter-spacing:0.06em; text-transform:uppercase;
    padding:9px 18px; border-radius:var(--rad2);
    border:none; cursor:pointer;
    transition:all .18s cubic-bezier(.22,1,.36,1);
    display:inline-flex; align-items:center; gap:7px;
  }
  .btn-p {
    background: linear-gradient(135deg, rgba(167,139,250,0.9), rgba(139,92,246,0.9));
    color:#fff;
    box-shadow: 0 4px 20px rgba(139,92,246,0.3), inset 0 1px 0 rgba(255,255,255,0.2);
  }
  .btn-p:hover {
    transform:translateY(-2px);
    box-shadow: 0 8px 32px rgba(139,92,246,0.45), inset 0 1px 0 rgba(255,255,255,0.25);
    background: linear-gradient(135deg, rgba(196,181,253,0.95), rgba(167,139,250,0.95));
  }
  .btn-p:disabled { opacity:.4; cursor:not-allowed; transform:none; box-shadow:none; }
  .btn-g {
    background:var(--glass2);
    backdrop-filter:var(--blur);
    color:var(--text2);
    border:1px solid var(--border2);
  }
  .btn-g:hover { background:var(--glass3); color:var(--text); border-color:var(--accent); }

  /* Tags */
  .tag {
    font-family:var(--mono); font-size:10px; font-weight:500;
    letter-spacing:0.06em; text-transform:uppercase;
    padding:3px 8px; border-radius:4px;
    display:inline-block;
  }
  .tg { background:rgba(110,231,183,0.12); color:var(--green); border:1px solid rgba(110,231,183,0.2); }
  .ty { background:rgba(252,211,77,0.12);  color:var(--yellow);border:1px solid rgba(252,211,77,0.2); }
  .tr { background:rgba(252,165,165,0.12); color:var(--red);   border:1px solid rgba(252,165,165,0.2); }
  .tb { background:rgba(147,197,253,0.12); color:var(--blue);  border:1px solid rgba(147,197,253,0.2); }
  .tp { background:rgba(196,181,253,0.12); color:var(--a2);    border:1px solid rgba(196,181,253,0.2); }
  .tc { background:rgba(103,232,249,0.12); color:var(--cyan);  border:1px solid rgba(103,232,249,0.2); }
  .tpk{ background:rgba(249,168,212,0.12); color:var(--pink);  border:1px solid rgba(249,168,212,0.2); }

  /* Inputs */
  input, textarea, select {
    background: rgba(255,255,255,0.05);
    backdrop-filter: blur(8px);
    border: 1px solid var(--border2);
    border-radius: var(--rad2);
    color: var(--text);
    font-family: var(--sans);
    font-size: 13px;
    padding: 10px 14px;
    width: 100%;
    outline: none;
    transition: border-color .15s, background .15s, box-shadow .15s;
  }
  input:focus, textarea:focus, select:focus {
    border-color: var(--accent);
    background: rgba(255,255,255,0.08);
    box-shadow: 0 0 0 3px rgba(167,139,250,0.15);
  }
  input::placeholder, textarea::placeholder { color: var(--text3); }
  textarea { resize:vertical; min-height:90px; }
  select option { background:#302b63; color:var(--text); }
  label {
    font-family:var(--mono); font-size:10px; font-weight:500;
    letter-spacing:0.1em; text-transform:uppercase;
    color:var(--text3); display:block; margin-bottom:6px;
  }
  .fg { margin-bottom:14px; }

  .mono { font-family:var(--mono); }
  .section-title {
    font-family:var(--mono); font-size:10px; color:var(--text3);
    letter-spacing:0.12em; text-transform:uppercase; margin-bottom:10px;
  }

  /* Score bar */
  .score-bar  { height:3px; border-radius:2px; background:rgba(255,255,255,0.08); overflow:hidden; }
  .score-fill { height:100%; border-radius:2px; transition:width 1.2s cubic-bezier(.4,0,.2,1); }

  /* Gradient text */
  .grad-text {
    background: linear-gradient(135deg, var(--a2), var(--cyan));
    -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  }

  /* Sidebar nav item hover */
  .nav-item {
    display:flex; align-items:center; gap:10px; padding:9px 16px;
    color:var(--text3); font-family:var(--mono); font-size:11px; font-weight:400;
    letter-spacing:0.06em; cursor:pointer;
    border-radius:var(--rad2); margin:1px 8px;
    transition:all .15s; border:1px solid transparent;
    position:relative;
  }
  .nav-item:hover { background:var(--glass2); color:var(--text2); border-color:var(--border); }
  .nav-item.active {
    background:linear-gradient(135deg,rgba(167,139,250,0.2),rgba(103,232,249,0.1));
    color:var(--a2); border-color:rgba(167,139,250,0.3);
    box-shadow:0 2px 12px rgba(139,92,246,0.15);
  }
`;

async function callClaude(systemPrompt, userPrompt, useSearch = false) {
  const body = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  };
  if (useSearch) body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    try {
      const clean = text.replace(/```json|```/g, "").trim();
      const match = clean.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : { raw: text };
    } catch { return { raw: text }; }
  } catch (e) { return { error: e.message }; }
}

const PROFILE = {
  name: "Asheesh",
  email: "asheeshdhamacharla@gmail.com",
  education: "B.Tech CS, SR University — GPA 9.05/10 (2026)",
  skills: "Python, PyTorch, LLMs, RAG, Speculative Decoding, FastAPI, React",
  projects: "Indic Hindi GPT-2 (13.9M params, custom BPE tokenizer, speculative decoding), Dia Legal (multimodal RAG), Job Hunt OS (7-agent platform), SentriX (supply chain agents)",
  resume: "Final-year CS student, SR University, GPA 9.05. Built Hindi GPT-2 from scratch with custom BPE tokenizer achieving 3.5x better fertility than Qwen2.5. Implemented speculative decoding engine. Projects: Dia Legal (multimodal RAG), Job Hunt OS (multi-agent platform, 47 endpoints), SentriX.",
  target: "AI Engineer, NLP Engineer, AI Research Engineer",
};

const STATUSES = ["Bookmarked", "Applied", "Interview", "Offer", "Rejected"];
const STATUS_COLORS = { Bookmarked: "var(--text3)", Applied: "var(--blue)", Interview: "var(--yellow)", Offer: "var(--green)", Rejected: "var(--red)" };
const STATUS_BG = {
  Bookmarked: "rgba(255,255,255,0.05)",
  Applied:    "rgba(147,197,253,0.10)",
  Interview:  "rgba(252,211,77,0.10)",
  Offer:      "rgba(110,231,183,0.10)",
  Rejected:   "rgba(252,165,165,0.10)",
};

const PAGES = [
  { id: "dashboard",   label: "Dashboard",   icon: "◈" },
  { id: "orchestrate", label: "Orchestrate",  icon: "❯_" },
  { id: "tracker",     label: "Pipeline",     icon: "⊞" },
  { id: "resume",      label: "Resume",       icon: "⊟" },
  { id: "research",    label: "Research",     icon: "⊕" },
  { id: "outreach",    label: "Outreach",     icon: "⊃" },
  { id: "interview",   label: "Interview",    icon: "⊘" },
  { id: "skills",      label: "Skill Gap",    icon: "⊗" },
  { id: "scout",       label: "Job Scout",    icon: "⊙" },
  { id: "feedback",    label: "Feedback",     icon: "⊚" },
];

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ page, setPage }) {
  return (
    <aside style={{
      width: 210, minHeight: "100vh",
      background: "rgba(15,12,41,0.6)",
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      borderRight: "1px solid var(--border)",
      position: "fixed", top: 0, left: 0, zIndex: 100,
      display: "flex", flexDirection: "column",
    }}>
      {/* Logo */}
      <div style={{ padding: "24px 16px 18px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg,rgba(167,139,250,0.8),rgba(103,232,249,0.6))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, color: "#fff", flexShrink: 0,
            boxShadow: "0 4px 16px rgba(139,92,246,0.4)",
          }}>◆</div>
          <div>
            <div style={{ fontFamily: "var(--sans)", fontWeight: 700, fontSize: 13, letterSpacing: "-0.01em" }} className="grad-text">Job Hunt OS</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text3)", letterSpacing: "0.08em", marginTop: 1 }}>multi-agent platform</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "10px 0", overflowY: "auto" }}>
        {PAGES.map(p => (
          <div
            key={p.id}
            className={`nav-item ${page === p.id ? "active" : ""}`}
            onClick={() => setPage(p.id)}
          >
            <span style={{ fontSize: 13, width: 18, textAlign: "center", flexShrink: 0 }}>{p.icon}</span>
            {p.label}
          </div>
        ))}
      </nav>

      {/* Status */}
      <div style={{
        padding: "14px 16px", borderTop: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: 8,
        fontFamily: "var(--mono)", fontSize: 10, color: "var(--text3)",
      }}>
        <div className="pulse-dot" />
        agents online
      </div>
    </aside>
  );
}

// ── Page Header ───────────────────────────────────────────────────────────────
function PH({ tag, title, desc }) {
  return (
    <div style={{ marginBottom: 32 }} className="fade-up">
      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--accent)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>◆ {tag}</div>
      <h1 style={{ fontFamily: "var(--sans)", fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1 }}>{title}</h1>
      {desc && <p style={{ color: "var(--text2)", fontSize: 14, marginTop: 6, fontWeight: 300 }}>{desc}</p>}
    </div>
  );
}

function ST({ children }) {
  return <div className="section-title">{children}</div>;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ apps, logs }) {
  const byStatus = STATUSES.reduce((a, s) => { a[s] = apps.filter(x => x.status === s); return a; }, {});
  const agentCounts = logs.reduce((a, l) => { a[l.agent] = (a[l.agent] || 0) + 1; return a; }, {});

  return (
    <div className="fade-up">
      <PH tag="Overview" title="Dashboard" desc={`${apps.length} applications · ${logs.length} agent runs`} />

      {/* Status pills */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 28 }}>
        {STATUSES.map(s => (
          <div key={s} className="glass" style={{ textAlign: "center", padding: "18px 10px", background: STATUS_BG[s] }}>
            <div style={{ fontSize: 36, fontWeight: 800, fontFamily: "var(--mono)", color: STATUS_COLORS[s], lineHeight: 1 }}>{byStatus[s]?.length || 0}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text3)", marginTop: 5, letterSpacing: "0.1em", textTransform: "uppercase" }}>{s}</div>
          </div>
        ))}
      </div>

      {/* Agent cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { id: "resume",    icon: "⊟", label: "Resume Agent",   grad: "rgba(167,139,250,0.8),rgba(139,92,246,0.5)" },
          { id: "research",  icon: "⊕", label: "Research Agent", grad: "rgba(147,197,253,0.8),rgba(59,130,246,0.5)" },
          { id: "outreach",  icon: "⊃", label: "Outreach Agent", grad: "rgba(110,231,183,0.8),rgba(16,185,129,0.5)" },
          { id: "interview", icon: "⊘", label: "Interview Prep", grad: "rgba(252,211,77,0.8),rgba(245,158,11,0.5)" },
          { id: "skill_gap", icon: "⊗", label: "Skill Gap",      grad: "rgba(252,165,165,0.8),rgba(239,68,68,0.5)" },
          { id: "job_scout", icon: "⊙", label: "Job Scout",      grad: "rgba(103,232,249,0.8),rgba(6,182,212,0.5)" },
        ].map(a => (
          <div key={a.id} className="glass" style={{ display: "flex", alignItems: "center", gap: 14, padding: 16 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: `linear-gradient(135deg,${a.grad})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 17, color: "#fff",
              boxShadow: `0 4px 16px rgba(0,0,0,0.2)`,
            }}>{a.icon}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{a.label}</div>
              <div style={{ color: "var(--text3)", fontFamily: "var(--mono)", fontSize: 10, marginTop: 2 }}>runs: {agentCounts[a.id] || 0}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Activity */}
      <div className="glass" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", fontFamily: "var(--mono)", fontSize: 10, color: "var(--text3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Recent Activity</div>
        {logs.length === 0
          ? <div style={{ padding: 40, textAlign: "center", color: "var(--text3)", fontFamily: "var(--mono)", fontSize: 12 }}>No activity yet. Run an agent to get started.</div>
          : [...logs].reverse().slice(0, 6).map((log, i, arr) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div className="pulse-dot" style={{
                background: log.rating >= 4 ? "var(--green)" : log.rating <= 2 ? "var(--red)" : "var(--yellow)",
                boxShadow: `0 0 8px ${log.rating >= 4 ? "var(--green)" : log.rating <= 2 ? "var(--red)" : "var(--yellow)"}`,
              }} />
              <span className="tag tp">{log.agent}</span>
              <span style={{ flex: 1, fontSize: 12, color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.input}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text3)", flexShrink: 0 }}>{log.time}</span>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ── Orchestrator ──────────────────────────────────────────────────────────────
function Orchestrator({ addLog }) {
  const [msgs, setMsgs] = useState([{ role: "sys", text: "Job Hunt OS v1.0 — Multi-Agent Orchestrator\nType a task. I route it to the right agents automatically." }]);
  const [inp, setInp] = useState("");
  const [loading, setL] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const EXAMPLES = [
    "Research Sarvam.ai for an AI Researcher interview",
    "Analyze my resume for this JD: We need a senior ML engineer...",
    "Write cold email to hiring manager at Krutrim for Research role",
    "What skills am I missing for AI Researcher at an LLM startup?",
  ];

  async function send() {
    if (!inp.trim() || loading) return;
    const msg = inp.trim(); setInp(""); setL(true);
    setMsgs(m => [...m, { role: "user", text: msg }]);
    const result = await callClaude(
      `You are an intelligent job search orchestration system. Analyze the user's request and provide helpful, specific output. The candidate is ${PROFILE.name}: ${PROFILE.resume}. Format your response clearly with sections. Be specific and actionable.`,
      msg
    );
    addLog("orchestrator", msg);
    setMsgs(m => [...m, { role: "agent", text: result.raw || JSON.stringify(result, null, 2) }]);
    setL(false);
  }

  return (
    <div className="fade-up" style={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column" }}>
      <PH tag="Command Center" title="Orchestrator" desc="Natural language → automatic agent routing" />
      <div className="glass" style={{ flex: 1, display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
        {/* Terminal chrome */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.03)" }}>
          {["#fca5a5", "#fcd34d", "#6ee7b7"].map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.8 }} />
          ))}
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text3)", marginLeft: 8 }}>job-hunt-os — orchestrator</span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {msgs.map((m, i) => (
            <div key={i}>
              {m.role === "sys" && <div style={{ color: "var(--text3)", fontSize: 11, fontFamily: "var(--mono)", whiteSpace: "pre-line", lineHeight: 1.9, padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8, borderLeft: "2px solid var(--border2)" }}>{m.text}</div>}
              {m.role === "user" && (
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <div style={{ background: "linear-gradient(135deg,rgba(167,139,250,0.25),rgba(103,232,249,0.15))", border: "1px solid rgba(167,139,250,0.3)", borderRadius: "12px 12px 2px 12px", padding: "10px 14px", fontSize: 13, maxWidth: "75%" }}>{m.text}</div>
                </div>
              )}
              {m.role === "agent" && (
                <div style={{ borderLeft: "2px solid var(--accent)", paddingLeft: 14 }}>
                  <pre style={{ fontSize: 12, color: "var(--text2)", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 400, overflowY: "auto", background: "rgba(255,255,255,0.03)", padding: 14, borderRadius: 8, fontFamily: "var(--mono)", lineHeight: 1.8 }}>{m.text}</pre>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="spinner" />
              <span style={{ color: "var(--text3)", fontSize: 11, fontFamily: "var(--mono)" }}>routing to agents...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", background: "rgba(255,255,255,0.03)", display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ color: "var(--accent)", fontFamily: "var(--mono)", fontSize: 14 }}>❯</span>
          <input value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Type a task… (Enter)" style={{ flex: 1, background: "transparent", border: "none", color: "var(--text)", fontSize: 13, outline: "none", fontFamily: "var(--mono)", boxShadow: "none", width: "auto" }} autoFocus />
          <button className="btn btn-p" onClick={send} disabled={loading} style={{ padding: "7px 14px" }}>→</button>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
        {EXAMPLES.map((ex, i) => (
          <button key={i} onClick={() => setInp(ex)}
            style={{ background: "var(--glass)", backdropFilter: "blur(8px)", border: "1px solid var(--border)", borderRadius: 20, padding: "5px 12px", color: "var(--text3)", fontSize: 11, fontFamily: "var(--mono)", cursor: "pointer", transition: "all .15s" }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--a2)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--text3)"; e.currentTarget.style.borderColor = "var(--border)"; }}>
            {ex.slice(0, 48)}{ex.length > 48 ? "…" : ""}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Tracker ───────────────────────────────────────────────────────────────────
function Tracker({ apps, setApps }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ company: "", role: "", status: "Bookmarked", location: "", notes: "" });

  function add() {
    if (!form.company || !form.role) return;
    setApps(a => [...a, { ...form, id: Date.now(), created: new Date().toLocaleDateString() }]);
    setForm({ company: "", role: "", status: "Bookmarked", location: "", notes: "" });
    setAdding(false);
  }
  function move(id, status) { setApps(a => a.map(x => x.id === id ? { ...x, status } : x)); }
  function del(id) { setApps(a => a.filter(x => x.id !== id)); }

  const byStatus = STATUSES.reduce((a, s) => { a[s] = apps.filter(x => x.status === s); return a; }, {});

  return (
    <div className="fade-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <PH tag="Pipeline" title="Application Tracker" desc={`${apps.length} total · ${byStatus.Interview?.length || 0} in interview`} />
        <button className="btn btn-p" onClick={() => setAdding(true)} style={{ marginTop: 38 }}>+ Add</button>
      </div>

      {adding && (
        <div className="glass" style={{ marginBottom: 20, padding: 20 }}>
          <ST>New Application</ST>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="fg"><label>Company *</label><input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Sarvam.ai" /></div>
            <div className="fg"><label>Role *</label><input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="AI Researcher" /></div>
            <div className="fg"><label>Location</label><input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Bengaluru" /></div>
            <div className="fg"><label>Status</label><select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div className="fg"><label>Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes…" style={{ minHeight: 60 }} /></div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-p" onClick={add}>Save</button>
            <button className="btn btn-g" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
        {STATUSES.map(status => (
          <div key={status}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, padding: "8px 12px", background: STATUS_BG[status], borderRadius: var_rad2(), border: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600, color: STATUS_COLORS[status], letterSpacing: "0.08em", textTransform: "uppercase" }}>{status}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 800, color: STATUS_COLORS[status] }}>{byStatus[status]?.length || 0}</span>
            </div>
            {(byStatus[status] || []).map(app => <AppCard key={app.id} app={app} onMove={move} onDel={del} statuses={STATUSES} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

function var_rad2() { return "10px"; }

function AppCard({ app, onMove, onDel, statuses }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass" style={{ padding: 14, marginBottom: 8, cursor: "pointer" }} onClick={() => setOpen(o => !o)}>
      <div style={{ fontWeight: 600, fontSize: 13 }}>{app.company}</div>
      <div style={{ color: "var(--text2)", fontSize: 11, marginTop: 3 }}>{app.role}</div>
      {app.location && <div style={{ color: "var(--text3)", fontSize: 10, marginTop: 4 }}>📍 {app.location}</div>}
      {open && (
        <div style={{ marginTop: 10, borderTop: "1px solid var(--border)", paddingTop: 10 }} onClick={e => e.stopPropagation()}>
          {app.notes && <p style={{ fontSize: 11, color: "var(--text2)", marginBottom: 8 }}>{app.notes}</p>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
            {statuses.filter(s => s !== app.status).map(s => (
              <button key={s} onClick={() => onMove(app.id, s)} style={{ background: "var(--glass2)", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 8px", fontSize: 9, fontFamily: "var(--mono)", color: "var(--text3)", cursor: "pointer" }}>→{s}</button>
            ))}
          </div>
          <button onClick={() => onDel(app.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", fontSize: 10, fontFamily: "var(--mono)" }}>✕ delete</button>
        </div>
      )}
    </div>
  );
}

// ── Resume Studio ─────────────────────────────────────────────────────────────
function ResumeStudio({ addLog }) {
  const [jd, setJd] = useState("");
  const [loading, setL] = useState(false);
  const [result, setResult] = useState(null);

  async function run() {
    if (!jd.trim()) return; setL(true); setResult(null);
    const r = await callClaude(
      `You are an expert ATS resume optimizer. Respond ONLY with JSON (no markdown): {"ats_score":0-100,"match_percentage":0-100,"found_keywords":[],"missing_keywords":[],"strong_points":[],"gaps":[],"rewritten_bullets":[{"original":"...","improved":"..."}],"skills_to_add":[],"summary_suggestion":"...","overall_recommendation":"..."}`,
      `RESUME: ${PROFILE.resume}\n\nSKILLS: ${PROFILE.skills}\n\nPROJECTS: ${PROFILE.projects}\n\nJOB DESCRIPTION: ${jd}`
    );
    addLog("resume", jd.slice(0, 60));
    setResult(r); setL(false);
  }

  return (
    <div className="fade-up">
      <PH tag="Resume Agent" title="Resume Studio" desc="ATS scoring, keyword gap, and bullet rewrites" />
      <div style={{ display: "grid", gridTemplateColumns: result ? "1fr 1.6fr" : "1fr", gap: 24 }}>
        <div>
          <div className="fg"><label>Job Description</label><textarea value={jd} onChange={e => setJd(e.target.value)} placeholder="Paste the full job description here…" style={{ minHeight: 260 }} /></div>
          <button className="btn btn-p" onClick={run} disabled={loading || !jd.trim()}>
            {loading ? <><div className="spinner" /> Analyzing…</> : "⚡ Analyze Resume"}
          </button>
        </div>
        {result && !result.error && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="glass" style={{ display: "flex", gap: 28, alignItems: "center", padding: 20 }}>
              <ScoreRing score={result.ats_score || 0} label="ATS Score" />
              <ScoreRing score={result.match_percentage || 0} label="JD Match" />
              <p style={{ flex: 1, fontSize: 12, color: "var(--text2)", lineHeight: 1.7 }}>{result.overall_recommendation}</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="glass" style={{ padding: 16 }}><ST>Found Keywords</ST><div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{(result.found_keywords || []).map((k, i) => <span key={i} className="tag tg">{k}</span>)}</div></div>
              <div className="glass" style={{ padding: 16 }}><ST>Missing Keywords</ST><div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{(result.missing_keywords || []).map((k, i) => <span key={i} className="tag tr">{k}</span>)}</div></div>
            </div>
            {result.rewritten_bullets?.length > 0 && (
              <div className="glass" style={{ padding: 16 }}><ST>Rewritten Bullets</ST>
                {result.rewritten_bullets.map((b, i) => (
                  <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: i < result.rewritten_bullets.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <div style={{ fontSize: 11, color: "var(--red)", textDecoration: "line-through", marginBottom: 4, opacity: 0.7 }}>{b.original}</div>
                    <div style={{ fontSize: 12, color: "var(--green)", lineHeight: 1.6 }}>→ {b.improved}</div>
                  </div>
                ))}
              </div>
            )}
            {result.summary_suggestion && <div className="glass" style={{ padding: 16 }}><ST>New Summary</ST><p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.7 }}>{result.summary_suggestion}</p></div>}
          </div>
        )}
        {result?.error && <div style={{ color: "var(--red)", fontFamily: "var(--mono)", fontSize: 12 }}>Error: {result.error}</div>}
      </div>
    </div>
  );
}

function ScoreRing({ score, label }) {
  const c = score >= 80 ? "var(--green)" : score >= 60 ? "var(--yellow)" : "var(--red)";
  return (
    <div style={{ textAlign: "center", flexShrink: 0 }}>
      <div style={{ fontSize: 42, fontWeight: 800, fontFamily: "var(--mono)", color: c, lineHeight: 1, textShadow: `0 0 20px ${c}40` }}>{score || 0}</div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>{label}</div>
      <div className="score-bar" style={{ marginTop: 6, width: 72 }}><div className="score-fill" style={{ width: `${score || 0}%`, background: c }} /></div>
    </div>
  );
}

// ── Research ──────────────────────────────────────────────────────────────────
function ResearchPanel({ addLog }) {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [loading, setL] = useState(false);
  const [result, setResult] = useState(null);

  async function run() {
    if (!company.trim()) return; setL(true); setResult(null);
    const r = await callClaude(
      `You are a company intelligence analyst. Respond ONLY with JSON: {"company_overview":"...","tech_stack":[],"interview_process":{"rounds":[],"difficulty":"...","focus_areas":[]},"what_they_look_for":[],"recent_news":[{"headline":"...","relevance":"..."}],"talking_points":[],"questions_to_ask":[],"green_flags":[],"engineering_culture":"..."}`,
      `Company: ${company}\nRole: ${role || "technical role"}`,
      true
    );
    addLog("research", company);
    setResult(r); setL(false);
  }

  return (
    <div className="fade-up">
      <PH tag="Research Agent" title="Company Research" desc="Tech stack, interview process, culture, what they look for" />
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24 }}>
        <div>
          <div className="fg"><label>Company</label><input value={company} onChange={e => setCompany(e.target.value)} placeholder="Sarvam.ai" /></div>
          <div className="fg"><label>Role (optional)</label><input value={role} onChange={e => setRole(e.target.value)} placeholder="AI Researcher" /></div>
          <button className="btn btn-p" onClick={run} disabled={loading || !company.trim()}>
            {loading ? <><div className="spinner" /> Researching…</> : "⊕ Research"}
          </button>
        </div>
        {result && !result.error && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {result.company_overview && <div className="glass" style={{ padding: 16 }}><ST>Overview</ST><p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7 }}>{result.company_overview}</p>{result.engineering_culture && <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 10, lineHeight: 1.6 }}>{result.engineering_culture}</p>}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {result.tech_stack?.length > 0 && <div className="glass" style={{ padding: 16 }}><ST>Tech Stack</ST><div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{result.tech_stack.map((t, i) => <span key={i} className="tag tb">{t}</span>)}</div></div>}
              {result.what_they_look_for?.length > 0 && <div className="glass" style={{ padding: 16 }}><ST>What They Look For</ST><div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{result.what_they_look_for.map((t, i) => <span key={i} className="tag tp">{t}</span>)}</div></div>}
            </div>
            {result.interview_process && <div className="glass" style={{ padding: 16 }}><ST>Interview Process</ST><span className="tag ty" style={{ marginRight: 8 }}>{result.interview_process.difficulty}</span>{result.interview_process.rounds?.map((r, i) => <span key={i} className="tag tb" style={{ marginRight: 5 }}>R{i + 1}: {r}</span>)}<div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 5 }}>{result.interview_process.focus_areas?.map((f, i) => <span key={i} className="tag tc">{f}</span>)}</div></div>}
            {result.talking_points?.length > 0 && <div className="glass" style={{ padding: 16 }}><ST>Talking Points</ST>{result.talking_points.map((t, i) => <div key={i} style={{ fontSize: 12, color: "var(--text2)", marginBottom: 6, display: "flex", gap: 8 }}><span style={{ color: "var(--accent)" }}>→</span>{t}</div>)}</div>}
            {result.questions_to_ask?.length > 0 && <div className="glass" style={{ padding: 16 }}><ST>Questions to Ask</ST>{result.questions_to_ask.map((q, i) => <div key={i} style={{ fontSize: 12, color: "var(--text2)", marginBottom: 6, display: "flex", gap: 8 }}><span style={{ color: "var(--cyan)" }}>{i + 1}.</span>{q}</div>)}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Outreach ──────────────────────────────────────────────────────────────────
function OutreachPanel({ addLog }) {
  const [form, setForm] = useState({ company: "", role: "", contact: "" });
  const [loading, setL] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState("");

  function copy(text, key) { navigator.clipboard?.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 2000); }

  async function run() {
    if (!form.company || !form.role) return; setL(true); setResult(null);
    const r = await callClaude(
      `You are an expert outreach writer. Respond ONLY with JSON: {"cold_email":{"subject":"...","body":"..."},"linkedin_connection_note":"300 chars max","follow_up_sequence":[{"day":3,"channel":"email","message":"..."},{"day":7,"channel":"linkedin","message":"..."}],"tips":["..."]}`,
      `Candidate: ${PROFILE.name}. Background: ${PROFILE.resume}. Target: ${form.company}, Role: ${form.role}, Contact: ${form.contact || "Hiring Manager"}`
    );
    addLog("outreach", form.company);
    setResult(r); setL(false);
  }

  const CopyBtn = ({ text, id }) => (
    <button onClick={() => copy(text, id)} style={{ background: "var(--glass2)", backdropFilter: "blur(8px)", border: "1px solid var(--border)", borderRadius: 5, padding: "3px 10px", color: copied === id ? "var(--green)" : "var(--text3)", fontSize: 10, fontFamily: "var(--mono)", cursor: "pointer", transition: "all .15s" }}>
      {copied === id ? "✓ copied" : "copy"}
    </button>
  );

  return (
    <div className="fade-up">
      <PH tag="Outreach Agent" title="Outreach Generator" desc="Cold emails, LinkedIn notes, follow-up sequences" />
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24 }}>
        <div>
          <div className="fg"><label>Company</label><input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Sarvam.ai" /></div>
          <div className="fg"><label>Role</label><input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="AI Researcher" /></div>
          <div className="fg"><label>Contact (optional)</label><input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} placeholder="Vivek Raghunathan" /></div>
          <button className="btn btn-p" onClick={run} disabled={loading || !form.company || !form.role}>
            {loading ? <><div className="spinner" /> Generating…</> : "⊃ Generate Outreach"}
          </button>
        </div>
        {result && !result.error && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {result.cold_email && (
              <div className="glass" style={{ padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><ST>Cold Email</ST><CopyBtn text={`Subject: ${result.cold_email.subject}\n\n${result.cold_email.body}`} id="email" /></div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent)", marginBottom: 10, padding: "6px 10px", background: "rgba(167,139,250,0.08)", borderRadius: 6 }}>Subject: {result.cold_email.subject}</div>
                <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{result.cold_email.body}</p>
              </div>
            )}
            {result.linkedin_connection_note && (
              <div className="glass" style={{ padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><ST>LinkedIn Note</ST><CopyBtn text={result.linkedin_connection_note} id="li" /></div>
                <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7 }}>{result.linkedin_connection_note}</p>
              </div>
            )}
            {result.follow_up_sequence?.length > 0 && (
              <div className="glass" style={{ padding: 18 }}>
                <ST>Follow-Up Sequence</ST>
                {result.follow_up_sequence.map((fu, i) => (
                  <div key={i} style={{ display: "flex", gap: 14, marginBottom: 12, paddingBottom: 12, borderBottom: i < result.follow_up_sequence.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent)", width: 50, flexShrink: 0, paddingTop: 2 }}>Day {fu.day}</div>
                    <div style={{ flex: 1 }}><span className="tag tb" style={{ marginBottom: 6, display: "inline-block" }}>{fu.channel}</span><p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6, marginTop: 5 }}>{fu.message}</p></div>
                    <CopyBtn text={fu.message} id={`fu${i}`} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Interview Prep ────────────────────────────────────────────────────────────
function InterviewPrep({ addLog }) {
  const [form, setForm] = useState({ company: "", role: "", jd: "" });
  const [loading, setL] = useState(false);
  const [result, setResult] = useState(null);
  const [open, setOpen] = useState({});

  async function run() {
    if (!form.company || !form.role) return; setL(true); setResult(null);
    const r = await callClaude(
      `You are a senior technical interviewer. Respond ONLY with JSON: {"company_specific_questions":[{"question":"...","category":"technical/behavioral/system_design","difficulty":"easy/medium/hard","why_theyll_ask":"...","model_answer":"..."}],"behavioral_questions":[{"question":"...","star_answer":{"situation":"...","task":"...","action":"...","result":"..."}}],"projects_deep_dive":[{"project":"...","expected_questions":[],"key_points":[],"known_weaknesses":[],"how_to_defend":"..."}],"questions_to_ask_them":[],"red_flags_to_avoid":[]}`,
      `Company: ${form.company}, Role: ${form.role}. Candidate: ${PROFILE.name}. Projects: ${PROFILE.projects}. Skills: ${PROFILE.skills}. Education: ${PROFILE.education}. JD: ${form.jd || "not provided"}`
    );
    addLog("interview", form.company);
    setResult(r); setL(false);
  }

  const diffC = d => d === "hard" ? "tag tr" : d === "medium" ? "tag ty" : "tag tg";
  const catC = c => c === "technical" ? "tag tb" : c === "system_design" ? "tag tp" : "tag tc";

  return (
    <div className="fade-up">
      <PH tag="Interview Agent" title="Interview Prep" desc="Specific questions and model answers using your actual projects" />
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24 }}>
        <div>
          <div className="fg"><label>Company</label><input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Sarvam.ai" /></div>
          <div className="fg"><label>Role</label><input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="AI Researcher" /></div>
          <div className="fg"><label>JD (optional)</label><textarea value={form.jd} onChange={e => setForm(f => ({ ...f, jd: e.target.value }))} placeholder="Paste JD for specific questions…" style={{ minHeight: 140 }} /></div>
          <button className="btn btn-p" onClick={run} disabled={loading || !form.company || !form.role}>
            {loading ? <><div className="spinner" /> Generating…</> : "⊘ Generate Prep"}
          </button>
        </div>
        {result && !result.error && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {result.company_specific_questions?.length > 0 && (
              <div className="glass" style={{ padding: 18 }}>
                <ST>Likely Questions ({result.company_specific_questions.length})</ST>
                {result.company_specific_questions.map((q, i) => (
                  <div key={i} style={{ marginBottom: 12, borderBottom: i < result.company_specific_questions.length - 1 ? "1px solid var(--border)" : "none", paddingBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }} onClick={() => setOpen(o => ({ ...o, [`q${i}`]: !o[`q${i}`] }))}>
                      <span style={{ color: "var(--text3)", fontFamily: "var(--mono)", fontSize: 12, marginTop: 2 }}>{open[`q${i}`] ? "▾" : "▸"}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.5 }}>{q.question}</div>
                        <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
                          <span className={catC(q.category)}>{q.category}</span>
                          <span className={diffC(q.difficulty)}>{q.difficulty}</span>
                        </div>
                      </div>
                    </div>
                    {open[`q${i}`] && (
                      <div style={{ marginTop: 10, marginLeft: 20 }}>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text3)", marginBottom: 6 }}>WHY: {q.why_theyll_ask}</div>
                        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 12, fontSize: 12, color: "var(--text2)", lineHeight: 1.8 }}>{q.model_answer}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {result.projects_deep_dive?.length > 0 && (
              <div className="glass" style={{ padding: 18 }}>
                <ST>Project Deep Dive</ST>
                {result.projects_deep_dive.map((p, i) => (
                  <div key={i} style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }} className="grad-text">{p.project}</div>
                    {p.expected_questions?.map((q, j) => <div key={j} style={{ fontSize: 12, color: "var(--text2)", marginBottom: 5 }}>Q: {q}</div>)}
                    {p.known_weaknesses?.length > 0 && <div style={{ marginTop: 8, padding: 10, background: "rgba(252,165,165,0.06)", borderRadius: 6, border: "1px solid rgba(252,165,165,0.1)" }}><span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--red)" }}>WEAKNESS: </span><span style={{ fontSize: 11, color: "var(--text2)" }}>{p.known_weaknesses[0]} → {p.how_to_defend}</span></div>}
                  </div>
                ))}
              </div>
            )}
            {result.questions_to_ask_them?.length > 0 && <div className="glass" style={{ padding: 18 }}><ST>Questions to Ask Them</ST>{result.questions_to_ask_them.map((q, i) => <div key={i} style={{ fontSize: 12, color: "var(--text2)", marginBottom: 8, display: "flex", gap: 8 }}><span style={{ color: "var(--accent)" }}>{i + 1}.</span>{q}</div>)}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Skill Gap ─────────────────────────────────────────────────────────────────
function SkillGap({ addLog }) {
  const [role, setRole] = useState("");
  const [jd, setJd] = useState("");
  const [loading, setL] = useState(false);
  const [result, setResult] = useState(null);

  async function run() {
    if (!role.trim()) return; setL(true); setResult(null);
    const r = await callClaude(
      `You are a senior AI/ML career strategist. Be brutally honest. Respond ONLY with JSON: {"skills_you_have":[{"skill":"...","level":"beginner/intermediate/advanced","evidence":"..."}],"skills_you_lack":[{"skill":"...","importance":"critical/important/nice-to-have","gap_size":"small/medium/large","why_it_matters":"..."}],"six_week_roadmap":[{"week":"Week 1-2","focus":"...","goal":"...","resources":[],"daily_hours":2}],"quick_wins":[{"action":"...","impact":"..."}],"competitive_advantage":"...","honest_assessment":"...","overall_readiness":0}`,
      `Target: ${role}. Candidate: ${PROFILE.name}. Skills: ${PROFILE.skills}. Projects: ${PROFILE.projects}. Education: ${PROFILE.education}. JD: ${jd || "not provided"}`
    );
    addLog("skill_gap", role);
    setResult(r); setL(false);
  }

  const impC = i => i === "critical" ? "tag tr" : i === "important" ? "tag ty" : "tag tb";

  return (
    <div className="fade-up">
      <PH tag="Skill Gap Agent" title="Skill Gap Analyzer" desc="Honest gap analysis and 6-week roadmap for your target role" />
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24 }}>
        <div>
          <div className="fg"><label>Target Role</label><input value={role} onChange={e => setRole(e.target.value)} placeholder="AI Researcher at LLM startup" /></div>
          <div className="fg"><label>JD (optional)</label><textarea value={jd} onChange={e => setJd(e.target.value)} placeholder="Paste JD for precise analysis…" style={{ minHeight: 150 }} /></div>
          <button className="btn btn-p" onClick={run} disabled={loading || !role.trim()}>
            {loading ? <><div className="spinner" /> Analyzing…</> : "⊗ Analyze Gaps"}
          </button>
        </div>
        {result && !result.error && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {result.overall_readiness !== undefined && (
              <div className="glass" style={{ display: "flex", gap: 24, alignItems: "center", padding: 20 }}>
                <div style={{ textAlign: "center", flexShrink: 0 }}>
                  <div style={{ fontSize: 56, fontWeight: 800, fontFamily: "var(--mono)", color: result.overall_readiness >= 70 ? "var(--green)" : result.overall_readiness >= 50 ? "var(--yellow)" : "var(--red)", lineHeight: 1, textShadow: `0 0 30px ${result.overall_readiness >= 70 ? "var(--green)" : result.overall_readiness >= 50 ? "var(--yellow)" : "var(--red)"}30` }}>{result.overall_readiness}</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text3)", textTransform: "uppercase", marginTop: 4 }}>Readiness %</div>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7, marginBottom: 10 }}>{result.honest_assessment}</p>
                  {result.competitive_advantage && <div style={{ fontSize: 12, color: "var(--green)" }}>★ {result.competitive_advantage}</div>}
                </div>
              </div>
            )}
            {result.skills_you_have?.length > 0 && <div className="glass" style={{ padding: 16 }}><ST>Skills You Have ✓</ST><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{result.skills_you_have.map((s, i) => <div key={i} style={{ padding: "4px 10px", background: "rgba(110,231,183,0.08)", border: "1px solid rgba(110,231,183,0.15)", borderRadius: 5 }}><span style={{ fontSize: 12, color: "var(--green)", fontWeight: 500 }}>{s.skill}</span><span style={{ fontSize: 10, color: "var(--text3)", marginLeft: 6 }}>{s.level}</span></div>)}</div></div>}
            {result.skills_you_lack?.length > 0 && (
              <div className="glass" style={{ padding: 16 }}><ST>Skills to Build</ST>
                {result.skills_you_lack.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12, paddingBottom: 12, borderBottom: i < result.skills_you_lack.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <span className={impC(s.importance)} style={{ flexShrink: 0 }}>{s.importance}</span>
                    <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 13 }}>{s.skill}</div><div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{s.why_it_matters}</div></div>
                    <span className="tag tb" style={{ flexShrink: 0 }}>{s.gap_size}</span>
                  </div>
                ))}
              </div>
            )}
            {result.six_week_roadmap?.length > 0 && (
              <div className="glass" style={{ padding: 16 }}><ST>6-Week Roadmap</ST>
                {result.six_week_roadmap.map((w, i) => (
                  <div key={i} style={{ display: "flex", gap: 14, marginBottom: 14 }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--accent)", width: 72, flexShrink: 0 }}>{w.week}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{w.focus}</div>
                      <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 6 }}>{w.goal}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{w.resources?.map((r, j) => <span key={j} className="tag tb">{r}</span>)}</div>
                    </div>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text3)", flexShrink: 0 }}>{w.daily_hours}h/day</span>
                  </div>
                ))}
              </div>
            )}
            {result.quick_wins?.length > 0 && <div className="glass" style={{ padding: 16 }}><ST>Quick Wins (Today)</ST>{result.quick_wins.map((w, i) => <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}><span style={{ color: "var(--yellow)" }}>⚡</span><div><div style={{ fontSize: 13, fontWeight: 500 }}>{w.action}</div><div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{w.impact}</div></div></div>)}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Job Scout ─────────────────────────────────────────────────────────────────
function JobScout({ addLog }) {
  const [loading, setL] = useState(false);
  const [result, setResult] = useState(null);
  const [email, setEmail] = useState("");
  const [subbed, setSubbed] = useState(false);

  async function run() {
    setL(true); setResult(null);
    const r = await callClaude(
      `You are a job search assistant. Respond ONLY with JSON: {"jobs":[{"title":"...","company":"...","location":"...","type":"full-time/internship","posted":"X days ago","match_score":0-100,"why_good_fit":"...","required_skills":[],"apply_url":"..."}],"total_found":0,"top_pick":"...","search_summary":"..."}`,
      `Find AI/ML/Research engineer jobs for: ${PROFILE.name}. Skills: ${PROFILE.skills}. Target roles: ${PROFILE.target}. Preferences: Bengaluru, Hyderabad or Remote, India.`,
      true
    );
    addLog("job_scout", "AI/ML jobs search");
    setResult(r); setL(false);
  }

  const mc = s => s >= 80 ? "var(--green)" : s >= 60 ? "var(--yellow)" : "var(--text3)";

  return (
    <div className="fade-up">
      <PH tag="Job Scout Agent" title="Job Scout" desc="Find current openings and subscribe to daily email digest" />
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24 }}>
        <div>
          <div className="glass" style={{ marginBottom: 14, padding: 18 }}>
            <ST>Search Now</ST>
            <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 14, lineHeight: 1.7 }}>Uses your profile to search for current AI/ML openings.</p>
            <button className="btn btn-p" onClick={run} disabled={loading} style={{ width: "100%" }}>
              {loading ? <><div className="spinner" /> Searching…</> : "⊙ Find Jobs"}
            </button>
          </div>
          <div className="glass" style={{ padding: 18 }}>
            <ST>Daily Digest</ST>
            {subbed ? (
              <div>
                <div style={{ fontSize: 12, color: "var(--green)", marginBottom: 6 }}>✓ Subscribed to {email}</div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 12 }}>Daily digest at 8:00 AM</div>
                <button className="btn btn-g" onClick={() => setSubbed(false)} style={{ fontSize: 10 }}>Unsubscribe</button>
              </div>
            ) : (
              <div>
                <div className="fg"><label>Email</label><input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@gmail.com" /></div>
                <button className="btn btn-p" onClick={() => { if (email) setSubbed(true); }} disabled={!email} style={{ width: "100%", fontSize: 10 }}>Subscribe to Daily Digest</button>
              </div>
            )}
          </div>
        </div>
        <div>
          {result ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <ST>Found {result.total_found || result.jobs?.length || 0} Jobs</ST>
                {result.top_pick && <span className="tag tg">Top: {result.top_pick}</span>}
              </div>
              {result.search_summary && <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16 }}>{result.search_summary}</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(result.jobs || []).map((job, i) => (
                  <div key={i} className="glass" style={{ display: "flex", gap: 16, padding: 18 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{job.title}</div>
                      <div style={{ color: "var(--accent)", fontSize: 13, marginTop: 3 }}>{job.company}</div>
                      <div style={{ color: "var(--text3)", fontSize: 11, marginTop: 4 }}>{job.location} · {job.type} · {job.posted}</div>
                      <div style={{ color: "var(--text2)", fontSize: 12, marginTop: 8, lineHeight: 1.6 }}>{job.why_good_fit}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10 }}>{job.required_skills?.slice(0, 5).map((s, j) => <span key={j} className="tag tb">{s}</span>)}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 28, fontWeight: 800, color: mc(job.match_score), textShadow: `0 0 20px ${mc(job.match_score)}40` }}>{job.match_score}%</div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text3)" }}>match</div>
                      {job.apply_url && <a href={job.apply_url} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: 10, fontSize: 11, color: "var(--accent)", textDecoration: "none" }}>Apply →</a>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="glass" style={{ textAlign: "center", padding: 60 }}>
              <div style={{ fontSize: 44, marginBottom: 14, opacity: 0.3, animation: "float 3s ease-in-out infinite" }}>⊙</div>
              <p style={{ color: "var(--text3)", fontSize: 13 }}>Click "Find Jobs" to search current openings</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Feedback Log ──────────────────────────────────────────────────────────────
function FeedbackLog({ logs, setLogs }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setL] = useState(false);

  function rate(i, rating) { setLogs(l => l.map((x, j) => j === i ? { ...x, rating } : x)); }

  async function analyze() {
    setL(true);
    const rated = logs.filter(l => l.rating);
    if (rated.length < 3) { setAnalysis({ status: "insufficient_data", message: `Need at least 3 rated runs. Have ${rated.length}.` }); setL(false); return; }
    const r = await callClaude(
      `You are a prompt engineer reviewing AI agent performance. Respond ONLY with JSON: {"avg_rating":0.0,"issues":["..."],"suggestions":["..."],"improved_instruction":"..."}`,
      `Rated agent runs: ${JSON.stringify(rated.map(l => ({ agent: l.agent, input: l.input, rating: l.rating })))}`
    );
    setAnalysis(r); setL(false);
  }

  return (
    <div className="fade-up">
      <PH tag="Feedback Loop" title="Agent Feedback" desc="Rate outputs to automatically improve future results" />
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <button className="btn btn-p" onClick={analyze} disabled={loading}>
          {loading ? <><div className="spinner" /> Analyzing…</> : "⊚ Run Analysis"}
        </button>
      </div>
      {analysis && (
        <div className="glass" style={{ marginBottom: 20, padding: 18 }}>
          <ST>Self-Improvement Analysis</ST>
          {analysis.status === "insufficient_data"
            ? <p style={{ fontSize: 13, color: "var(--text3)" }}>{analysis.message}</p>
            : (
              <div>
                {analysis.issues?.map((issue, i) => <div key={i} style={{ fontSize: 12, color: "var(--text2)", marginBottom: 5, display: "flex", gap: 8 }}><span style={{ color: "var(--red)" }}>✗</span>{issue}</div>)}
                <div style={{ marginTop: 12 }}>{analysis.suggestions?.map((s, i) => <div key={i} style={{ fontSize: 12, color: "var(--text2)", marginBottom: 5, display: "flex", gap: 8 }}><span style={{ color: "var(--green)" }}>→</span>{s}</div>)}</div>
                {analysis.improved_instruction && <div style={{ marginTop: 12, padding: 12, background: "rgba(167,139,250,0.08)", borderRadius: 8, borderLeft: "2px solid var(--accent)" }}><ST>Prompt Improvement</ST><p style={{ fontSize: 12, color: "var(--text)", marginTop: 6 }}>{analysis.improved_instruction}</p></div>}
              </div>
            )
          }
        </div>
      )}
      <div className="glass" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", fontFamily: "var(--mono)", fontSize: 10, color: "var(--text3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{logs.length} runs logged</div>
        {logs.length === 0
          ? <div style={{ padding: 40, textAlign: "center", color: "var(--text3)", fontSize: 12, fontFamily: "var(--mono)" }}>No runs yet. Use an agent to see logs here.</div>
          : [...logs].reverse().map((log, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: i < logs.length - 1 ? "1px solid var(--border)" : "none" }}>
              <span className="tag tp">{log.agent}</span>
              <span style={{ flex: 1, fontSize: 12, color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.input}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text3)", flexShrink: 0 }}>{log.time}</span>
              <div style={{ display: "flex", gap: 2 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => rate(logs.length - 1 - i, n)} style={{ background: "none", border: "none", cursor: "pointer", color: log.rating >= n ? "var(--yellow)" : "rgba(255,255,255,0.1)", fontSize: 15, padding: 1, transition: "all .1s" }}>★</button>
                ))}
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [apps, setApps] = useState([
    { id: 1, company: "Sarvam.ai",  role: "AI Researcher",     status: "Applied",    location: "Bengaluru", created: "2026-02-28" },
    { id: 2, company: "Krutrim",    role: "Research Engineer",  status: "Interview",  location: "Bengaluru", created: "2026-02-25" },
    { id: 3, company: "Ola",        role: "ML Engineer",        status: "Bookmarked", location: "Bengaluru", created: "2026-03-01" },
    { id: 4, company: "Google",     role: "Research Intern",    status: "Applied",    location: "Hyderabad", created: "2026-02-20" },
  ]);
  const [logs, setLogs] = useState([]);

  function addLog(agent, input) {
    setLogs(l => [...l, { agent, input: input.slice(0, 80), time: new Date().toLocaleTimeString(), rating: null }]);
  }

  const pageProps = { apps, setApps, logs, setLogs, addLog };

  return (
    <>
      <style>{style}</style>
      <div style={{ display: "flex", position: "relative", zIndex: 1 }}>
        <Sidebar page={page} setPage={setPage} />
        <main style={{ marginLeft: 210, flex: 1, minHeight: "100vh", padding: "36px 40px", position: "relative", zIndex: 1 }}>
          {page === "dashboard"   && <Dashboard {...pageProps} />}
          {page === "orchestrate" && <Orchestrator {...pageProps} />}
          {page === "tracker"     && <Tracker {...pageProps} />}
          {page === "resume"      && <ResumeStudio {...pageProps} />}
          {page === "research"    && <ResearchPanel {...pageProps} />}
          {page === "outreach"    && <OutreachPanel {...pageProps} />}
          {page === "interview"   && <InterviewPrep {...pageProps} />}
          {page === "skills"      && <SkillGap {...pageProps} />}
          {page === "scout"       && <JobScout {...pageProps} />}
          {page === "feedback"    && <FeedbackLog {...pageProps} />}
        </main>
      </div>
    </>
  );
}