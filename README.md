# Dentarith — Clinical Decision-Support Platform for Dentistry

Dentarith is an editorial, production-quality dental clinical decision-support copilot designed to help dental clinicians structure clinical findings, reason through differential hypotheses, detect diagnostic contradictions, identify missing information, and prepare clinician-verified treatment plans.

Dentarith operates strictly as a **clinician-in-control support tool**, preserving dental professional judgment across every phase of case assessment.

---

## 🏛️ Architecture & Core Principles

1. **Clinician In Control (Non-Autonomous)**: Dentarith provides structured decision support, differential comparisons, and missing information alerts. It never initiates treatment, issues autonomous prescriptions, or replaces the licensed clinician's professional judgment.
2. **Local-First Storage with Optional Cloud Operations**: Clinical cases and report data are saved in browser local storage. Settings also provides authenticated PostgreSQL cloud sync and local-to-cloud case import. Clinical text is sent to Gemini for analysis. Use synthetic/de-identified cases; cloud sync and account isolation have unresolved defects listed in the engineering audit.
3. **Radiograph Client-Side Isolation**: Uploaded radiograph images remain strictly in local browser memory and session storage. Image payloads are explicitly stripped (`radiograph: null`) before sending clinical text to the AI reasoning engine to prevent unverified visual hallucinations.
4. **Dual Tooth-Numbering Architecture**: Seamless bidirectional support for both the **Universal Numbering System** (USA: #1–32) and the **FDI World Dental Federation Two-Digit Notation** (ISO 3950: 11–48), complete with an interactive dental arch selector and anatomical metadata mapping.
5. **Strict Schema & Type Safety**: Strict validation on case inputs (`clinicalCaseSchema`), AI reasoning responses (`ClinicalAnalysis`), and backup bundles using Zod schemas. Invalid or incomplete model responses are rejected with recoverable errors.
6. **AI Pipeline**: Server-side credentials via `@google/genai` (defaulting to `gemini-3.8-flash`), AbortSignal timeout handling (28s), and retries for transient upstream rate limits (429) or service outages (503). Production access controls and error/log sanitization need further verification.

See [the engineering audit and prioritized backlog](docs/ENGINEERING_AUDIT.md) for verified development status and production blockers, and [AGENTS.md](AGENTS.md) for development safeguards. Implemented features are not a claim of clinical validation or production readiness.

---

## 🦷 Tooth Numbering & Anatomy Engine

Dental clinicians work across different numbering conventions. Dentarith provides a built-in bidirectional anatomy engine (`src/lib/tooth-numbering.ts`):
- **Universal Numbering System (#1–32)**: Standard permanent dentition notation widely used in the United States.
- **FDI World Dental Federation (11–48)**: International standard (ISO 3950) used across Europe, Commonwealth nations, and global clinical literature.
- **Interactive Dental Arch Selector (`ToothChart`)**: Maxillary (upper) and mandibular (lower) arches with live hover inspection, system toggles, and single-click autofill for tooth number, arch, quadrant, and region.
- **AI Prompt Grounding**: System instructions explicitly guide the AI reasoning engine to interpret tooth numbers correctly across both numbering schemes and verify quadrant concordance.

---

## 📋 Comprehensive Clinical Workflow

- **Case Intake (`/cases/new`)**:
  - Jump navigation between sections: Chief Complaint, Pain Assessment, Tooth Assessment & Arch Selector, Pulpal & Periapical Tests, Periodontal Exam, Hard & Soft Tissues, Medical/Dental History, and Investigations.
  - Radiograph de-identification guidelines and client-side isolation notice.
  - Quick-fill synthetic clinical archetypes for rapid exploration.
- **AI Differential Reasoning (`/cases/[id]`)**:
  - Structured observation vs. interpretation separation.
  - Ranked differential diagnoses with clinical likelihood badges (High, Moderate, Low) and taxonomy categories (Pulpal, Apical, Periodontal, Hard Tissue, Soft Tissue, Other).
  - Explicit justification for why the leading consideration ranks highest (`whyRanksHighest`).
  - Evidence mapping: linking specific clinical findings directly to their diagnostic implications.
  - Contradiction detection: highlighting genuine conflicts between reported symptoms and objective exam findings.
  - Prioritized missing information: classified by importance (`critical`, `important`, `useful`) with clinical explanations.
  - Decision-changing evidence criteria: tests that could alter diagnostic rankings.
- **Clinician Decision Trace (`ClinicianReviewTrace`)**:
  - Dedicated verification checklist for the attending dentist.
  - Document concurrence or divergence from AI considerations.
  - Record final diagnosis and clinician-approved treatment plan.
- **Formal Printable Clinical Reports (`/cases/[id]/report`)**:
  - High-contrast, publication-grade print stylesheet.
  - Full case chronology, findings breakdown, differential summary, and clinician sign-off block.
- **Case Management (`/cases`)**:
  - Multi-attribute search by patient identifier, tooth number, or chief complaint.
  - Status filters: Draft, Current Analysis, Stale Analysis, and Reviewed.
  - Local storage quota tracking and automatic quota recovery.
  - De-identified JSON export and import for workspace backups.
- **Benchmark Cases (`/cases/demo` & `/settings`)**:
  - Built-in educational archetypes: Symptomatic Irreversible Pulpitis, Reversible Pulpitis, and Pulpal Necrosis with Chronic Apical Periodontitis.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20.9 or newer (minimum required by the installed Next.js version)
- Google Gemini API key (`GEMINI_API_KEY` or `GOOGLE_API_KEY`)

### Installation & Local Setup

1. **Clone the repository and install dependencies**:
   ```bash
   git clone https://github.com/nath2807/dentai.git
   cd dentai
   npm install
   ```

2. **Configure environment variables in `.env.local`**:
   ```bash
   # Required: Google Gemini API Key
   GEMINI_API_KEY=your_gemini_api_key_here

   # Optional: Custom Gemini Model (defaults to gemini-3.8-flash)
   # GEMINI_MODEL=gemini-3.8-flash
   ```

   Production authentication/cloud operations additionally require `DATABASE_URL`,
   `AUTH_SECRET` (at least 32 characters), `UPSTASH_REDIS_REST_URL`, and
   `UPSTASH_REDIS_REST_TOKEN`. `NEXTAUTH_SECRET` is a supported secret alias.
   Keep `ENABLE_DEMO_ACCOUNTS` disabled in production. Configure SQL schema
   through a reviewed migration plan; this project has no migration CLI yet.
   `/api/cloud/migrate` imports cases and does not migrate the SQL schema.

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Verification & Quality Assurance

Dentarith maintains a comprehensive automated testing and validation suite:

- **Run all automated tests**:
  ```bash
  npm test
  ```
  At the latest 2026-10-13 verification: 204 tests passed across 17 suites. The default configuration clears inherited service credentials and excludes live PostgreSQL tests. Persistent stores reject bulk clearing. Do not load `.env.local` into tests or bypass the isolation. Workflow library tests do not establish browser end-to-end coverage.

- **Run explicit disposable PostgreSQL integration checks**:
  Follow [the local test database instructions](docs/POSTGRES_TESTING.md), then run `npm run test:postgres`. This separate command requires explicit opt-in and a local `TEST_DATABASE_URL`; it never falls back to the application database. Six live checks are implemented but have not yet been executed successfully against PostgreSQL in this workspace.

- **Run linter**:
  ```bash
  npm run lint
  ```
  Reports ESLint errors and warnings across the codebase.

- **Run production build**:
  ```bash
  npm run build
  ```
  Validates Next.js compilation, Turbopack bundling, TypeScript type-checking, and static/partial prerendering. A successful build does not verify live database, authentication, AI, or browser behavior.

---

## 🛡️ Clinical Governance & Safety Notice

> **CLINICAL NOTICE:** Dentarith is an experimental clinical decision-support software application intended solely for educational, research, and assistive exploration by qualified dental professionals.
> - Dentarith does **NOT** provide autonomous medical diagnosis or treatment prescriptions.
> - It does **NOT** replace thorough physical clinical examination, objective diagnostic testing (sensibility tests, radiographic evaluation, periodontal probing), or licensed clinical judgment.
> - Do not input protected health information (PHI/PII); use de-identified case identifiers.
> - Dentarith makes no claims of regulatory clearance (such as FDA 510(k) or CE mark) or autonomous clinical validation.

---

## 📦 Production Deployment

Dentarith builds as a Next.js Node.js application. Deployment requires reviewed configuration and validation:

1. Review production blockers in the engineering audit and configure the required hosting variables listed above. Never deploy or run production database migrations without explicit approval.
2. Run standard build step: `npm run build`.
3. Start production server: `npm start`.
