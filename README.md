# Dentarith — Clinical Intelligence for Dentistry

**Dentarith Clinical Copilot**

Dentarith is an AI-powered clinical decision-support copilot designed to help dentists structure clinical findings, reason through diagnostic possibilities, identify missing information, compare differentials, and consider treatment options while keeping the dentist in control.

---

## Overview

Dentarith empowers dental practitioners through structured clinical reasoning workflows:
- **Comprehensive Case Intake**: 15 structured clinical assessment sections covering chief complaint, medical/dental history, vitality sensibility testing (cold, heat, electric pulp testing), periapical examination, hard/soft tissue findings, periodontal metrics, and investigations.
- **Evidence-Based Diagnostic Reasoning**: Rigorous separation of reported, observed, and inferred clinical data powered by Google Gemini structured outputs.
- **Differential Hypotheses & Evidence Mapping**: Explicit ranking of diagnostic considerations with supporting evidence, contradiction detection, and why the leading consideration ranks highest.
- **Clinical Safety & Missing Information**: Proactive identification of high-impact missing investigations (such as periapical radiographs), decision-changing evidence criteria, red flags, and diagnostic uncertainty disclosures.
- **Case Management & Persistence**: Client-side local case repository with state tracking (`draft`, `analyzed`, `reviewed`), real-time search, filtering, and stale analysis protection.
- **Professional Clinical Reports**: Printable and PDF-exportable decision-support summaries with clinician verification signature lines.

---

## Clinical Safety Notice

> **IMPORTANT:** Dentarith provides assistive clinical decision support only. It is **not** an autonomous medical diagnostic device or electronic health record system. All diagnostic hypotheses, differentials, and treatment considerations must be independently evaluated and verified by a licensed dental professional before establishing a definitive diagnosis or initiating patient care.

---

## Getting Started

### Prerequisites
- Node.js 18+ or 20+
- Google Gemini API key (`GEMINI_API_KEY`)

### Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env.local`:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Verification & Testing

Run the test suite:
```bash
npm test
```

Run linter:
```bash
npm run lint
```

Build for production:
```bash
npm run build
```

---

## Tech Stack
- **Framework**: Next.js (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI Engine**: Google Gemini API via `@google/genai`
- **Validation**: Zod schema validation
- **Testing**: Vitest
