# backend/profile.py
# Asheesh's default profile — all agents read from here.
# Overridden at runtime via PUT /api/settings if user edits in UI.

DEFAULT_PROFILE = {
    "name": "Asheesh",
    "email": "asheesh@example.com",   # update with real email
    "phone": "+91-XXXXXXXXXX",
    "location": "Hyderabad, India",
    "linkedin": "linkedin.com/in/asheesh",
    "github": "github.com/asheesh",

    "education": (
        "B.Tech Computer Science, SR University, Warangal — GPA 9.05/10 (2022–2026)\n"
        "Relevant Coursework: Machine Learning, Deep Learning, Algorithms, "
        "Computer Vision, NLP"
    ),

    "skills": (
        "Languages: Python, C++, SQL, JavaScript\n"
        "Frameworks: PyTorch, TensorFlow, HuggingFace Transformers, FastAPI, React\n"
        "AI/ML: LLMs, RAG, Speculative Decoding, Autonomous Agents, "
        "Multimodal Systems, Computer Vision, NLP\n"
        "Tools: Docker, Git, LanceDB, pdfplumber, WhisperX, SentenceTransformers, CLIP\n"
        "Concepts: Autonomous Agents, Reinforcement Learning, Speculative Decoding, "
        "Transformer Architecture, System Design"
    ),

    "projects": (
        "1. Dia Legal — AI Legal Intelligence Platform\n"
        "   - Multimodal ingestion pipeline: SentenceTransformers (384d) + CLIP (512d), "
        "LanceDB vector store, cross-encoder reranking, WhisperX diarization\n"
        "   - Evidence classification, contradiction detection (threshold 0.4), "
        "adversarial argument testing\n"
        "   - Witness credibility scoring 0–10, automated trial brief generation, "
        "professional PDF export\n\n"
        "2. EAAD — Entropy-Aware Adaptive Speculative Decoding\n"
        "   - Entropy-based draft length control, JS distance acceptance criterion\n"
        "   - AdaSD-style adaptive thresholds (validated by arXiv:2512.11280)\n"
        "   - TinyLlama 1.1B → Llama-2 7B pair, benchmarked on Qwen 2.5 family\n\n"
        "3. SentriX — Autonomous Supply Chain Agent\n"
        "   - Multi-agent system with autonomous tool use and environment interaction\n"
        "   - 5 risk dimensions, real-time monitoring dashboard"
    ),

    "target_roles": [
        "AI Researcher",
        "Research Engineer",
        "ML Engineer",
        "AI Engineer",
    ],

    "target_companies": [
        "Sarvam.ai",
        "Krutrim",
        "Ola",
        "Google DeepMind",
        "Microsoft Research",
    ],

    "job_preferences": {
        "roles": "AI Researcher, Research Engineer, ML Engineer",
        "locations": "Bengaluru, Hyderabad, Remote",
        "salary_range": "8–20 LPA",
        "work_type": "Full-time, Internship",
        "keywords": "LLM, autonomous agents, NLP, deep learning, PyTorch",
    },

    "resume_text": (
        "Asheesh | CS Final Year | SR University | GPA 9.05\n"
        "Skills: Python, PyTorch, LLMs, RAG, Autonomous Agents, Speculative Decoding, "
        "Computer Vision, FastAPI, React\n"
        "Projects: Dia Legal (multimodal RAG legal platform), "
        "EAAD (entropy-aware speculative decoding), "
        "SentriX (autonomous supply chain agents)\n"
        "Research: Implemented GPT-2 from scratch; entropy-based inference optimization "
        "independently validated by AdaSD (Dec 2025)"
    ),

    "digest_email": "asheesh@example.com",  # where daily job digest is sent
    "digest_subscribed": True,
}