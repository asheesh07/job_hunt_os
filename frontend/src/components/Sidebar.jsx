import React from 'react';

const LOOP_PAGES = [
  { id: "loop",     label: "Dashboard",    icon: "◈" },
  { id: "tracker",  label: "Applications", icon: "⊞" },
  { id: "outreach", label: "Outreach",     icon: "⊃" },
  { id: "fit",      label: "Fit Scorer",   icon: "⊕" },
];

const TOOL_PAGES = [
  { id: "resume",      label: "Resume",     icon: "⊟" },
  { id: "research",    label: "Research",   icon: "⊙" },
  { id: "interview",   label: "Interview",  icon: "⊘" },
  { id: "skills",      label: "Skill Gap",  icon: "⊗" },
  { id: "scout",       label: "Job Scout",  icon: "⊚" },
  { id: "orchestrate", label: "Orchestrate",icon: "❯_"},
  { id: "feedback",    label: "Feedback",   icon: "⊛" },
];

function NavSection({ label, pages, page, setPage }) {
  return (
    <>
      <div style={{
        fontFamily: "var(--mono)", fontSize: 9,
        color: "var(--text3)", letterSpacing: "0.14em",
        textTransform: "uppercase", padding: "10px 16px 4px",
      }}>
        {label}
      </div>
      {pages.map(p => (
        <div
          key={p.id}
          className={`nav-item ${page === p.id ? "active" : ""}`}
          onClick={() => setPage(p.id)}
        >
          <span style={{ fontSize: 13, width: 18, textAlign: "center", flexShrink: 0 }}>
            {p.icon}
          </span>
          {p.label}
        </div>
      ))}
    </>
  );
}

export default function Sidebar({ page, setPage }) {
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
            <div style={{ fontFamily: "var(--sans)", fontWeight: 700, fontSize: 13, letterSpacing: "-0.01em" }} className="grad-text">
              Job Hunt OS
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text3)", letterSpacing: "0.08em", marginTop: 1 }}>
              intelligence loop
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "6px 0", overflowY: "auto" }}>
        <NavSection label="Loop" pages={LOOP_PAGES} page={page} setPage={setPage} />

        <div style={{
          borderTop: "1px solid var(--border)",
          margin: "8px 0",
        }} />

        <NavSection label="Tools" pages={TOOL_PAGES} page={page} setPage={setPage} />
      </nav>

      {/* Status */}
      <div style={{
        padding: "14px 16px", borderTop: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: 8,
        fontFamily: "var(--mono)", fontSize: 10, color: "var(--text3)",
      }}>
        <div className="pulse-dot" />
        4 agents active
      </div>
    </aside>
  );
}