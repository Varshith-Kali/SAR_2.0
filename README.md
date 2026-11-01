# SAR Assist — Security Architecture Review Platform

An enterprise-grade **Security Architecture Review (SAR) intake and assessment platform** built with React, TypeScript, Tailwind CSS, and Express. It guides engineering and security teams through structured security reviews, dynamic scope evaluation, AI-assisted executive summaries, and audit-ready Excel and PDF exports.

---

## Features

- **4-Phase Guided Review Flow**
  - **1. Request Basics** — Project / Request Name, business unit, connected CMDB applications, owners, and preliminary data types
  - **2. Preliminary Discovery (`WHO · HOW · WHERE · WHAT`)** — 4-stage dynamic scoping wizard (`P1`–`P30`) with optional Stage 5 scope customization and teammate delegation
  - **3. Security Checklist (`M1`–`M17`)** — Dynamically unlocked security control questionnaire and repeater tables (Servers/VMs, Firewall Rules, API Endpoints, Integrations)
  - **4. Review & Submit** — Tagged AI SAR Summary, 2-sheet Excel workbook preview, printable PDF report, SHA-256 integrity verification, and sign-off

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
│   ├── App.tsx                              # Root application state, phase router, session persistence
│   ├── main.tsx                             # React DOM entry point
│   ├── index.css                            # Tailwind CSS v4 & adaptive theme styles
│   ├── components/
│   │   ├── RequestBasicsView.tsx            # Phase 1: Request Basics & CMDB app selector
│   │   ├── PreliminaryChecklistView.tsx     # Phase 2: Preliminary Discovery (Stages 1–4 + Scope Customization)
│   │   ├── DetailedModulesView.tsx          # Phase 3: Security Checklist (M1–M17)
│   │   ├── RepeaterTableEditors.tsx         # Structured editors for Servers, Firewalls, APIs & Integrations
│   │   ├── ReviewAndSubmitView.tsx          # Phase 4: AI Summary, 2-Sheet Workbook, Contradictions & Sign-Off
│   │   ├── ApiConfigDialog.tsx              # Ephemeral OpenAI API key & model selector dialog
│   │   └── CyberScrollTrace.tsx             # Header progress & section indicators
│   ├── hooks/
│   │   └── useLlmConfig.ts                  # Ephemeral in-memory LLM configuration hook
│   └── shared/
│       ├── types.ts                         # TypeScript interfaces and domain types
│       ├── definitions.ts                   # Canonical P1–P30 & M1–M17 question definitions
│       ├── rulesEngine.ts                   # Deterministic DAG evaluator, flow gates & secret redaction
│       ├── sarAiEngine.ts                   # Project-tagged AI summary prompt & streaming pipeline
│       ├── sarV5Engine.ts                   # Control library mapping & validation engine
│       ├── patternLearningEngine.ts         # Architecture pattern classification engine
│       ├── exportGenerator.ts               # 2-Sheet Excel (.xls) and printable PDF/HTML generators
│       ├── seedData.ts                      # Sample SAR scenarios & browser session storage helpers
│       └── llmConfig.ts                     # OpenAI model catalog & key validation helpers
├── index.html                               # Application HTML entry point
├── server.ts                                # Express API & Vite middleware server
├── vite.config.ts                           # Vite bundler configuration
├── tsconfig.json                            # TypeScript compiler configuration
└── package.json                             # Scripts and dependencies
```

---

## License

MIT

