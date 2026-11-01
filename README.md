# SAR 2.0 — Security Architecture Review Platform

An enterprise-grade **Security Architecture Review (SAR) intake and assessment platform** built with React, TypeScript, and Express. It guides teams through structured security reviews, generates AI-powered summaries, and produces audit-ready Excel and PDF exports.

---

## Features

- **4-Phase Guided Review Flow**
  - **Request Basics** — Project metadata, business unit, owners, risk tier
  - **Preliminary Discovery** — 6-stage scoping wizard (access patterns, data classification, network topology, integrations, third-party, compliance)
  - **Security Checklist** — Dynamically unlocked 16-module questionnaire driven by preliminary answers
  - **Review & Submit** — AI summary, 2-sheet Excel workbook, PDF export, and final sign-off

- **Deterministic Rules Engine** — Scope gates automatically enable/disable checklist modules based on preliminary answers; contradictions are flagged with guided override flow

- **AI SAR Summary** — Streams a plain-English executive summary via OpenAI GPT; covers change scope, architecture, access model, integrations, network, third-party governance, and reviewer focus areas. No internal codes or jargon in output.

- **Audit-Ready Exports**
  - `.xls` workbook — Sheet 1: Preliminary responses; Sheet 2: Security checklist answers
  - `.html` PDF report — Full SAR record formatted for printing / archiving

- **Sample Scenarios** — One-click seed with realistic pre-filled SAR scenarios for demo and testing

- **Dark / Light theme** — System-aware with manual toggle

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS v4, Framer Motion |
| Backend | Express 5, tsx (ESM) |
| Dev Server | Vite 6 (HMR) |
| AI | OpenAI API (streaming SSE) |
| Package Manager | pnpm |

---

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9+

### Install & Run

```bash
pnpm install
pnpm dev
```

App runs at **http://localhost:3000**

### Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key — entered at runtime via the "Configure LLM" dialog; not required at startup |

> **Note:** The app works fully without an API key — the AI summary section will prompt you to configure one when needed. All other features (form filling, exports, rules engine) work without any API key.

---

## Project Structure

```
SAR_2.0/
├── src/
│   ├── components/
│   │   ├── App.tsx                      # Root — phase router, theme, session
│   │   ├── RequestBasicsView.tsx        # Phase 1: project metadata
│   │   ├── PreliminaryDiscoveryView.tsx # Phase 2: 6-stage scoping wizard
│   │   ├── ChecklistView.tsx            # Phase 3: 16-module security checklist
│   │   └── ReviewAndSubmitView.tsx      # Phase 4: AI summary, exports, sign-off
│   └── shared/
│       ├── types.ts                     # All TypeScript types and enums
│       ├── sarDefinitions.ts            # Question definitions, modules, options
│       ├── rulesEngine.ts              # Deterministic scope gate evaluator
│       ├── sarAiEngine.ts              # AI summary generation + prompt pipeline
│       ├── exportGenerator.ts          # Excel (.xls) and PDF (.html) builders
│       ├── seedData.ts                 # Sample SAR scenarios for demo/testing
│       └── llmConfig.ts               # LLM config schema
├── public/                             # Static assets
├── server.ts                           # Express + Vite dev server entry point
├── vite.config.ts
├── tsconfig.json
├── package.json
└── .env.example
```

---

## Usage

### Running a Sample Scenario

1. Open **http://localhost:3000**
2. Click **"Sample & Excel"** — fills all fields with a realistic SAR scenario and jumps to Review & Submit
3. Click **"Export .xls File"** to download the workbook
4. Click **"Export PDF Report"** to download the HTML report
5. To generate an AI summary, click **"Configure LLM"**, enter your OpenAI API key, then click **"Generate AI SAR Summary"**

### Manual Flow

1. Fill **Request Basics** → click Next
2. Work through **Preliminary Discovery** stages 1–6 → click Next
3. Answer unlocked modules in the **Security Checklist** → click Next
4. On **Review & Submit**: review the checklist, generate AI summary, export, and submit

---

## License

MIT
