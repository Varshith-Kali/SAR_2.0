# SAR Assist — Security Architecture Review Platform

An enterprise-grade **Security Architecture Review (SAR) intake and assessment platform** built with React, TypeScript, Tailwind CSS, and Express. It guides engineering and security teams through structured security reviews, dynamic scope evaluation, AI-assisted executive summaries, and audit-ready Excel and PDF exports.

---

## Features

- **5-Phase Guided Review Flow**
  - **1. Request Basics** — Project / Request Name, mandatory ServiceNow Ticket, business unit, target go-live date, connected CMDB applications, and preliminary data types
  - **2. Preliminary Discovery (`WHAT · WHO · HOW · WHERE`)** — 4-stage dynamic scoping wizard (`P1`–`P30`) with side-by-side User × Platform, Integration, and Per-Application Hosting threads
  - **3. Security Checklist (`M1`–`M16`)** — Dynamically unlocked security control questionnaire, chained follow-up verifications, and repeater tables (Firewall Rules, API Endpoints, Integrations)
  - **4. Architecture Flow (`WHAT · WHO · HOW · WHERE`)** — Automatic 1-view high-level security architecture board synthesized strictly from Preliminary Discovery responses
  - **5. Review & Submit** — Tagged AI SAR Summary, 2-sheet Excel workbook export, printable PDF report, SHA-256 integrity verification, and sign-off

- **Deterministic Rules & Scope Engine** — Evaluates answers in topological order to dynamically unlock/hide modules and conditional follow-up questions (`showOnlyIf`, `requireIf`, `hardRequireIf`), filter options by hosting topology (`on_prem`, `cloud`, `saas`), and detect cross-answer contradictions (`CHK-01`–`CHK-07`).

- **Project-Tagged AI SAR Summary** — Generates an executive SAR summary via OpenAI (`store: false`, ephemeral in-memory session key) explicitly tagged to the **Project / Request Name** and covering all answered Preliminary and Security Checklist domains.

- **Audit-Ready Exports**
  - `.xls` 2-Sheet Workbook — Sheet 1: Preliminary Checklist (`P1`–`P30`) + Executive AI Summary; Sheet 2: Security Questionnaire (`M1`–`M16`) + Architecture Inventories
  - Printable PDF / HTML Report — Complete audit record formatted for archival and ISG review

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS v4, Motion |
| Backend | Express, tsx (ESM) |
| Bundler | Vite |
| AI Integration | OpenAI API (Streaming SSE, ephemeral client-supplied key) |

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm or pnpm

### Install & Run

```bash
npm install
npm run dev
```

Application runs at **http://localhost:3000**

### Production Build & Type Check

```bash
npm run lint
npm run build
npm start
```

---

## Project Structure

```
sar-assist/
├── src/
│   ├── App.tsx                              # Root application state, 5-phase router, session persistence
│   ├── main.tsx                             # React DOM entry point
│   ├── index.css                            # Tailwind CSS v4 & adaptive theme styles
│   ├── components/
│   │   ├── RequestBasicsView.tsx            # Phase 1: Request Basics & CMDB app selector
│   │   ├── PreliminaryChecklistView.tsx     # Phase 2: Preliminary Discovery (Stages 1–4)
│   │   ├── DetailedModulesView.tsx          # Phase 3: Security Checklist (M1–M16)
│   │   ├── ArchitectureFlowView.tsx         # Phase 4: 1-View Architecture Flow Board (WHAT · WHO · HOW · WHERE)
│   │   ├── ReviewAndSubmitView.tsx          # Phase 5: AI Summary, 2-Sheet Workbook, Contradictions & Sign-Off
│   │   ├── RepeaterTableEditors.tsx         # Structured editors for Firewalls, APIs & Integrations
│   │   ├── ApiConfigDialog.tsx              # Ephemeral OpenAI API key configuration dialog
│   │   └── CyberScrollTrace.tsx             # Hardware-synced scroll trace rail & navigation helpers
│   ├── hooks/
│   │   └── useLlmConfig.ts                  # Ephemeral in-memory LLM configuration hook
│   └── shared/
│       ├── types.ts                         # TypeScript interfaces and domain types
│       ├── definitions.ts                   # Canonical P1–P30 & M1–M17 question definitions
│       ├── checklistChains.ts               # Multi-dimensional thread & follow-up chain definitions
│       ├── rulesEngine.ts                   # Deterministic DAG evaluator, flow gates & secret redaction
│       ├── sarAiEngine.ts                   # Project-tagged AI summary prompt & streaming pipeline
│       ├── sarV5Engine.ts                   # Control library mapping & validation engine
│       ├── patternLearningEngine.ts         # Architecture pattern classification engine
│       ├── exportGenerator.ts               # 2-Sheet Excel (.xls) and printable PDF/HTML generators
│       ├── seedData.ts                      # Sample SAR scenarios & browser session storage helpers
│       └── llmConfig.ts                     # Ephemeral key validation helpers
├── index.html                               # Application HTML entry point
├── server.ts                                # Express API & Vite middleware server
├── vite.config.ts                           # Vite bundler configuration
├── tsconfig.json                            # TypeScript compiler configuration
└── package.json                             # Scripts and dependencies
```

---

## License

MIT

