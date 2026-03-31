import { useState } from "react";
import Sidebar from "./components/Sidebar.jsx";

// loop agents
import LoopDashboard from "./components/loop/LoopDashboard.jsx";
import ApplicationTracker from "./components/loop/ApplicationTracker.jsx";
import FitScorer from "./components/loop/FitScorer.jsx";
import OutreachEngine from "./components/loop/OutreachEngine.jsx";

// utility tools
import Dashboard from "./components/Dashboard.jsx";
import Orchestrator from "./components/Orchestrator.jsx";
import ResumeStudio from "./components/ResumeStudio.jsx";
import ResearchPanel from "./components/ResearchPanel.jsx";
import InterviewPrep from "./components/InterviewPrep.jsx";
import SkillGap from "./components/SkillGap.jsx";
import JobScout from "./components/JobScout.jsx";
import FeedbackLog from "./components/FeedbackLog.jsx";

import "./index.css";

export default function App() {
  const [page, setPage] = useState("loop");

  return (
    <div style={{ display: "flex", position: "relative", zIndex: 1 }}>
      <Sidebar page={page} setPage={setPage} />
      <main style={{
        marginLeft: 210, flex: 1, minHeight: "100vh",
        padding: "36px 40px", position: "relative", zIndex: 1,
      }}>
        {page === "loop"        && <LoopDashboard />}
        {page === "tracker"     && <ApplicationTracker />}
        {page === "fit"         && <FitScorer />}
        {page === "outreach"    && <OutreachEngine />}

        {page === "resume"      && <ResumeStudio />}
        {page === "research"    && <ResearchPanel />}
        {page === "interview"   && <InterviewPrep />}
        {page === "skills"      && <SkillGap />}
        {page === "scout"       && <JobScout />}
        {page === "orchestrate" && <Orchestrator />}
        {page === "feedback"    && <FeedbackLog />}
        {page === "dashboard"   && <Dashboard />}
      </main>
    </div>
  );
}