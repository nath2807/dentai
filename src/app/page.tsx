"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon, Logo } from "@/components/clinical-ui";
import { ToothChart } from "@/components/tooth-chart";
import { formatToothWithSystem } from "@/lib/tooth-numbering";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePreviewCondition, setActivePreviewCondition] = useState<
    "pulpitis" | "necrosis" | "cracked"
  >("pulpitis");
  const [selectedDemoTooth, setSelectedDemoTooth] = useState("19");

  const previewCases = {
    pulpitis: {
      tooth: "19",
      condition: "Symptomatic Irreversible Pulpitis",
      category: "Pulpal Pathology",
      likelihood: "High",
      whyHighest:
        "Lingering thermal response (45s) after cold application with history of nocturnal spontaneous ache confirms irreversible pulpal inflammation.",
      symptoms: "Sharp throbbing nocturnal pain in lower left quadrant, wakes patient at night.",
      sensibility: "Cold test (Endo-Ice) produces intense sharp pain lingering for 45 seconds (control #20: 2s normal).",
      periapical: "Percussion mild tender (+); palpation normal (-); no mobility or sinus tract.",
      leadingDifferentials: [
        {
          rank: "#1",
          name: "Symptomatic Irreversible Pulpitis",
          status: "Leading Consideration",
          notes: "Consistent with prolonged exaggerated thermal response and nocturnal spontaneous pain.",
        },
        {
          rank: "#2",
          name: "Symptomatic Apical Periodontitis",
          status: "Secondary Component",
          notes: "Mild tenderness to percussion indicates extension of pulpal inflammation into apical PDL.",
        },
      ],
      criticalGap: "Periapical radiograph required to assess periapical radiolucency and root canal morphology.",
    },
    necrosis: {
      tooth: "8",
      condition: "Pulpal Necrosis with Asymptomatic Apical Periodontitis",
      category: "Pulpal & Periapical",
      likelihood: "High",
      whyHighest:
        "Complete lack of sensibility response on cold and EPT combined with tooth discoloration and history of sports trauma.",
      symptoms: "Noticeable grayish discoloration of upper right front tooth; no acute spontaneous pain.",
      sensibility: "Cold test negative (-); Electric Pulp Test (EPT) no response (80/80). Control #9 responds normally (cold 2s, EPT 24/80).",
      periapical: "Percussion negative (-); palpation negative (-); no swelling or sinus tract.",
      leadingDifferentials: [
        {
          rank: "#1",
          name: "Pulpal Necrosis",
          status: "Leading Consideration",
          notes: "Unresponsive to both cold and electric pulp testing, consistent with non-vital necrotic pulp.",
        },
        {
          rank: "#2",
          name: "Previous Trauma Calcific Metamorphosis",
          status: "Rule-out Differential",
          notes: "Pulp chamber obliteration can cause false-negative sensibility without true necrosis.",
        },
      ],
      criticalGap: "Periapical radiograph required to evaluate apical lamina dura integrity and rule out periapical radiolucency.",
    },
    cracked: {
      tooth: "30",
      condition: "Cracked Tooth Syndrome (Incomplete Fracture)",
      category: "Hard Tissue / Structural",
      likelihood: "Moderate",
      whyHighest:
        "Rebound pain upon release of biting pressure with Tooth Slooth, intact margins on large amalgam restoration, without lingering thermal ache.",
      symptoms: "Sharp, brief pain strictly when chewing hard foods (granola, nuts); no nocturnal throbbing.",
      sensibility: "Cold test responds with immediate sharp sensation that subsides within 2 seconds (normal reversible pulp response).",
      periapical: "Bite stick (Tooth Slooth) reproduces sharp pain specifically on the distobuccal cusp release. Percussion negative (-).",
      leadingDifferentials: [
        {
          rank: "#1",
          name: "Incomplete Coronal Fracture (Cracked Tooth)",
          status: "Leading Consideration",
          notes: "Classic sharp rebound pain on cuspal release over large mesio-occlusal-distal amalgam.",
        },
        {
          rank: "#2",
          name: "Reversible Pulpitis Secondary to Restorative Leakage",
          status: "Secondary Differential",
          notes: "Stimulated transient thermal sensitivity without spontaneous lingering episodes.",
        },
      ],
      criticalGap: "Transillumination and methylene blue staining recommended to visualize fracture line extent.",
    },
  };

  const activeCase = previewCases[activePreviewCondition];

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased selection:bg-teal-100 selection:text-teal-900">
      {/* 1. TOP ANNOUNCEMENT & CLINICAL GOVERNANCE BANNER */}
      <div className="border-b border-teal-900/20 bg-[#090d16] px-4 py-2.5 text-center text-xs text-slate-300">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
          <span className="font-semibold text-white">
            Dentarith Clinical Intelligence
          </span>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="hidden sm:inline text-slate-300">
            Assistive Clinical Decision Support for Licensed Dental Professionals
          </span>
          <span className="rounded-full bg-teal-950 px-2 py-0.5 text-[10px] font-bold text-teal-400 border border-teal-800/60 ml-1">
            Non-Autonomous
          </span>
        </div>
      </div>

      {/* 2. NAVIGATION HEADER */}
      <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
          {/* Logo & Brand Identity */}
          <Link href="/" className="group flex items-center gap-3.5 focus:outline-none">
            <Logo size={38} />
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-slate-950 leading-none group-hover:text-teal-800 transition">
                Dentarith
              </span>
              <span className="hidden text-[11px] font-semibold tracking-wide text-teal-800 sm:inline-block mt-0.5">
                Clinical Intelligence for Dentistry
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            <a
              href="#overview"
              className="text-xs font-semibold uppercase tracking-wider text-slate-600 transition hover:text-teal-800"
            >
              Overview
            </a>
            <a
              href="#clinical-workflow"
              className="text-xs font-semibold uppercase tracking-wider text-slate-600 transition hover:text-teal-800"
            >
              Clinical Workflow
            </a>
            <a
              href="#interactive-preview"
              className="text-xs font-semibold uppercase tracking-wider text-slate-600 transition hover:text-teal-800"
            >
              Reasoning Engine
            </a>
            <a
              href="#tooth-chart-demo"
              className="text-xs font-semibold uppercase tracking-wider text-slate-600 transition hover:text-teal-800"
            >
              Tooth Chart
            </a>
            <a
              href="#clinical-governance"
              className="text-xs font-semibold uppercase tracking-wider text-slate-600 transition hover:text-teal-800"
            >
              Governance &amp; Safety
            </a>
            <Link
              href="/cases"
              className="text-xs font-bold uppercase tracking-wider text-teal-800 transition hover:text-teal-950"
            >
              Workspace
            </Link>
          </nav>

          {/* Action CTAs */}
          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/cases/demo"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition hover:border-teal-500 hover:text-teal-800"
            >
              Benchmark Cases
            </Link>
            <Link
              href="/cases/new"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 text-xs font-bold text-white shadow-xs transition hover:bg-teal-800"
            >
              <span>Launch Clinical Copilot</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 md:hidden"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            <Icon name={mobileMenuOpen ? "close" : "menu"} size={20} />
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="border-b border-slate-200 bg-white px-6 py-6 shadow-xl md:hidden">
            <nav className="flex flex-col space-y-4">
              <a
                href="#overview"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-slate-700 hover:text-teal-800"
              >
                Overview
              </a>
              <a
                href="#clinical-workflow"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-slate-700 hover:text-teal-800"
              >
                Clinical Workflow
              </a>
              <a
                href="#interactive-preview"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-slate-700 hover:text-teal-800"
              >
                Reasoning Engine
              </a>
              <a
                href="#tooth-chart-demo"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-slate-700 hover:text-teal-800"
              >
                Interactive Tooth Chart
              </a>
              <a
                href="#clinical-governance"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-slate-700 hover:text-teal-800"
              >
                Governance &amp; Safety
              </a>
              <Link
                href="/cases"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-teal-800"
              >
                Clinical Workspace
              </Link>
              <div className="pt-4 border-t border-slate-100 flex flex-col gap-2.5">
                <Link
                  href="/cases/demo"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-11 items-center justify-center rounded-lg border border-slate-300 text-xs font-bold text-slate-700"
                >
                  Benchmark Cases
                </Link>
                <Link
                  href="/cases/new"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-11 items-center justify-center rounded-lg bg-teal-700 text-xs font-bold text-white shadow-xs"
                >
                  Launch Clinical Copilot →
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* 3. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-[#090d16] to-[#0f172a] py-20 text-white sm:py-28 lg:py-32 clinical-grid-pattern-dark">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            {/* Clinical Eyebrow Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-950/70 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-teal-300 shadow-inner">
              <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
              <span>Evidence-Grounded Clinical Decision Support</span>
            </div>

            {/* Main Headline */}
            <h1 className="mt-7 text-4xl font-black tracking-tight text-white sm:text-6xl sm:leading-[1.12]">
              Clinical Intelligence for Dentistry.
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-lg leading-relaxed text-slate-300 sm:text-xl">
              Dentarith structures complex dental findings into transparent diagnostic reasoning,
              ranked differential considerations, missing-evidence alerts, and treatment considerations —
              keeping the licensed dentist in complete control of patient care.
            </p>

            {/* Action Buttons */}
            <div className="mt-10 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
              <Link
                href="/cases/new"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-7 text-sm font-bold text-white shadow-lg transition hover:bg-teal-500 sm:w-auto"
              >
                <span>Start New Case Assessment</span>
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/cases/demo"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-7 text-sm font-semibold text-slate-200 backdrop-blur-xs transition hover:bg-slate-700 sm:w-auto"
              >
                <span>Explore Benchmark Cases</span>
              </Link>
              <Link
                href="/cases"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-teal-500/40 bg-teal-950/50 px-6 text-sm font-semibold text-teal-300 backdrop-blur-xs transition hover:bg-teal-900/60 sm:w-auto"
              >
                <span>Open Workspace</span>
              </Link>
            </div>

            {/* Guardrail Clarification */}
            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Icon name="shield" size={16} className="text-teal-400 shrink-0" />
              <span>
                Non-autonomous tool. Output is decision support; treating dentist makes all clinical determinations.
              </span>
            </div>
          </div>

          {/* Interactive Live Hero Showcase */}
          <div className="mt-14 mx-auto max-w-5xl rounded-2xl border border-slate-700/80 bg-slate-900/90 p-3 shadow-[0_25px_60px_rgba(0,0,0,0.5)] sm:p-5 backdrop-blur-md">
            {/* Header bar */}
            <div className="flex flex-col gap-2.5 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5" aria-hidden="true">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-xs font-bold text-slate-200">
                  Dentarith Clinical Engine — Live Diagnostic Demonstration
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-semibold text-teal-300">
                <span className="rounded-md bg-teal-950 px-2 py-0.5 border border-teal-800">
                  Universal #19 (FDI 36)
                </span>
                <span className="rounded-md bg-slate-800 text-slate-300 px-2 py-0.5 border border-slate-700">
                  Evidence-Mapped
                </span>
                <span className="rounded-md bg-blue-950 text-blue-300 px-2 py-0.5 border border-blue-800">
                  Zod Validated
                </span>
              </div>
            </div>

            {/* 3-Column Preview Grid */}
            <div className="mt-5 grid gap-4 lg:grid-cols-3 text-slate-900">
              {/* Col 1: Findings Input */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                    Reported &amp; Observed Findings
                  </p>
                  <span className="text-[10px] font-semibold text-slate-400">Tooth #19</span>
                </div>
                <div className="mt-3 space-y-2 text-xs">
                  <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                    <span className="font-bold text-slate-800">Symptoms:</span>
                    <p className="text-slate-600 mt-0.5">
                      Spontaneous nocturnal throbbing in lower left molar region.
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                    <span className="font-bold text-slate-800">Sensibility (Cold):</span>
                    <p className="text-slate-600 mt-0.5">
                      Severe sharp pain lingering 45s (control #20: 2s normal).
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                    <span className="font-bold text-slate-800">Periapical Tests:</span>
                    <p className="text-slate-600 mt-0.5">
                      Percussion mild tender (+); palpation normal (-); no sinus tract.
                    </p>
                  </div>
                </div>
              </div>

              {/* Col 2: Diagnostic Reasoning */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                    Ranked Diagnostic Considerations
                  </p>
                  <span className="text-[10px] font-semibold text-teal-800">Rank 1 of 2</span>
                </div>
                <div className="mt-3 space-y-2.5 text-xs">
                  <div className="rounded-lg border border-teal-200 bg-teal-50/70 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-950">
                        #1 Symptomatic Irreversible Pulpitis
                      </span>
                      <span className="rounded-full bg-teal-200 text-[10px] font-bold text-teal-950 px-2 py-0.5">
                        High
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-700">
                      Lingering thermal response (45s) after cold stimulus confirmed by sensory test. Pulpal tissue incapable of healing.
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        #2 Symptomatic Apical Periodontitis
                      </span>
                      <span className="rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700 px-2 py-0.5">
                        Secondary
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-600">
                      Positive percussion indicates extension of pulpal inflammation into apical periodontal ligament.
                    </p>
                  </div>
                </div>
              </div>

              {/* Col 3: Missing Information & Governance */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    Missing Evidence &amp; Oversight
                  </p>
                  <span className="text-[10px] font-bold text-amber-700">Critical Check</span>
                </div>
                <div className="mt-3 space-y-2.5 text-xs">
                  <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-2.5">
                    <span className="font-bold text-amber-950">Missing Investigation:</span>
                    <p className="text-amber-900 text-[11px] mt-0.5">
                      Periapical radiograph not entered. Periapical bony status and root canal anatomy unconfirmed.
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                    <span className="font-bold text-slate-800">Decision-Changing Test:</span>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      Periapical radiolucency would re-rank diagnosis toward pulpal necrosis with apical periodontitis.
                    </p>
                  </div>
                  <div className="pt-1 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Clinician Status:</span>
                    <span className="font-bold text-teal-800">Awaiting Dentist Review</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. OVERVIEW / CLINICAL CHALLENGE */}
      <section id="overview" className="border-t border-slate-200 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-800">
              The Diagnostic Challenge
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              Endodontic &amp; Dental Diagnostic Reasoning Demands Precision.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Dental consultations generate disparate pieces of evidence: subjective pain timelines, thermal responses, electric pulp testing, periapical percussion, probing depths, and restorative history.
            </p>
          </div>

          {/* 3 Pillar Cards */}
          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-7 shadow-xs">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 text-teal-900 font-bold text-sm">
                01
              </div>
              <h3 className="mt-5 text-base font-bold text-slate-950">
                Dispersed Diagnostic Clues
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Symptoms, control tooth baseline tests, percussion tenderness, and probing depths are often recorded in separate notes, complicating fast clinical synthesis.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-7 shadow-xs">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 text-teal-900 font-bold text-sm">
                02
              </div>
              <h3 className="mt-5 text-base font-bold text-slate-950">
                Unstated Differential Hypotheses
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Crucial differential diagnoses frequently remain implicit mental models. Dentarith structures hypotheses side-by-side with supporting and contradicting observations.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-7 shadow-xs">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 text-teal-900 font-bold text-sm">
                03
              </div>
              <h3 className="mt-5 text-base font-bold text-slate-950">
                Transparent Evidence Gaps
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Missing a control tooth test or periapical radiograph can lead to premature diagnostic closure. Dentarith makes missing evidence and decision-changing criteria visible.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CLINICAL PIPELINE WORKFLOW */}
      <section id="clinical-workflow" className="border-t border-slate-200 bg-slate-50/60 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-800">
              The 4-Stage Clinical Pipeline
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              From Case Intake to Dentist-Verified Care.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              A disciplined, transparent diagnostic reasoning workflow designed for clinical rigor.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <span className="text-xs font-black tracking-widest text-teal-800 uppercase">
                01 — Intake &amp; Teeth
              </span>
              <h3 className="mt-3 text-base font-bold text-slate-950">
                Structured Findings Capture
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Record patient symptoms, medical &amp; dental history, interactive tooth selection (Universal or FDI), vitality testing, and periapical findings.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <span className="text-xs font-black tracking-widest text-teal-800 uppercase">
                02 — Taxonomy
              </span>
              <h3 className="mt-3 text-base font-bold text-slate-950">
                Separation of Evidence
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Strict boundary enforcement: Patient-reported symptoms, objective clinician observations, and AI-inferred interpretations are never conflated.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <span className="text-xs font-black tracking-widest text-teal-800 uppercase">
                03 — Reasoning
              </span>
              <h3 className="mt-3 text-base font-bold text-slate-950">
                Differential &amp; Gaps
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Synthesize ranked diagnostic considerations, evidence maps, contradiction detection, and decision-changing investigation requirements.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <span className="text-xs font-black tracking-widest text-teal-800 uppercase">
                04 — Governance
              </span>
              <h3 className="mt-3 text-base font-bold text-slate-950">
                Clinician Decision Trace
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                The licensed dentist reviews the reasoning, agrees or specifies an alternative diagnosis, documents treatment considerations, and signs off.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. INTERACTIVE REASONING PREVIEW */}
      <section id="interactive-preview" className="border-t border-slate-200 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-800">
              Interactive Diagnostic Reasoning
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              Inspect Clinical Scenarios in Action.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Select an educational reference condition below to observe how Dentarith maps specific clinical observations into explainable diagnostic considerations.
            </p>

            {/* Condition Selector Tabs */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setActivePreviewCondition("pulpitis")}
                className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                  activePreviewCondition === "pulpitis"
                    ? "bg-teal-700 text-white shadow-xs"
                    : "border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                Tooth #19 — Irreversible Pulpitis
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewCondition("necrosis")}
                className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                  activePreviewCondition === "necrosis"
                    ? "bg-teal-700 text-white shadow-xs"
                    : "border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                Tooth #8 — Pulpal Necrosis
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewCondition("cracked")}
                className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                  activePreviewCondition === "cracked"
                    ? "bg-teal-700 text-white shadow-xs"
                    : "border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                Tooth #30 — Cracked Tooth Syndrome
              </button>
            </div>
          </div>

          {/* Active Preview Showcase Box */}
          <div className="mt-12 mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-slate-50/70 p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                  {activeCase.category}
                </span>
                <h3 className="text-xl font-bold text-slate-950 sm:text-2xl">
                  {activeCase.condition}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reference Tooth: {formatToothWithSystem(activeCase.tooth)}
                </p>
              </div>
              <span className="inline-flex self-start rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-900 sm:self-center">
                {activeCase.likelihood} Likelihood
              </span>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {/* Findings */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Reported &amp; Objective Findings
                </h4>
                <div className="rounded-xl bg-white p-3.5 border border-slate-200/80 text-xs">
                  <span className="font-bold text-slate-800">Chief Complaint &amp; Pain:</span>
                  <p className="mt-1 text-slate-600">{activeCase.symptoms}</p>
                </div>
                <div className="rounded-xl bg-white p-3.5 border border-slate-200/80 text-xs">
                  <span className="font-bold text-slate-800">Pulp Sensibility:</span>
                  <p className="mt-1 text-slate-600">{activeCase.sensibility}</p>
                </div>
                <div className="rounded-xl bg-white p-3.5 border border-slate-200/80 text-xs">
                  <span className="font-bold text-slate-800">Periapical Testing:</span>
                  <p className="mt-1 text-slate-600">{activeCase.periapical}</p>
                </div>
              </div>

              {/* Differentials & Why Ranks Highest */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Clinical Reasoning &amp; Differentials
                </h4>
                <div className="rounded-xl bg-teal-50/80 p-4 border border-teal-200 text-xs">
                  <span className="font-bold text-teal-950">Why This Hypothesis Ranks Highest:</span>
                  <p className="mt-1 text-teal-900 leading-relaxed">{activeCase.whyHighest}</p>
                </div>
                <div className="rounded-xl bg-white p-3.5 border border-slate-200/80 text-xs">
                  <span className="font-bold text-slate-800">Ranked Alternatives:</span>
                  <ul className="mt-2 space-y-2">
                    {activeCase.leadingDifferentials.map((diff) => (
                      <li key={diff.rank} className="border-t border-slate-100 pt-1.5 first:border-0 first:pt-0">
                        <div className="flex items-center justify-between font-semibold text-slate-900">
                          <span>{diff.rank} {diff.name}</span>
                          <span className="text-[10px] text-slate-400">{diff.status}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{diff.notes}</p>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl bg-amber-50/80 p-3.5 border border-amber-200 text-xs">
                  <span className="font-bold text-amber-950">Critical Evidence Gap:</span>
                  <p className="mt-0.5 text-amber-900 text-[11px]">{activeCase.criticalGap}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. INTERACTIVE TOOTH CHART DEMO */}
      <section id="tooth-chart-demo" className="border-t border-slate-200 bg-slate-50/50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-800">
              Anatomical Precision
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              Universal (#1–32) &amp; FDI (11–48) Numbering Systems.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Dentarith speaks both Universal Numbering and FDI World Dental Federation notation natively. Select any tooth on the anatomical chart to test bidirectional mapping.
            </p>
          </div>

          <div className="mt-12 mx-auto max-w-3xl">
            <ToothChart
              selectedToothNumber={selectedDemoTooth}
              onSelectTooth={(t) => setSelectedDemoTooth(t ? t.universal : "")}
            />
          </div>
        </div>
      </section>

      {/* 8. COMPARISON MATRIX: TRADITIONAL VS DENTARITH */}
      <section className="border-t border-slate-200 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-800">
              Clinical Differentiation
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              Fragmented Notes vs. Structured Clinical Copilot.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              How Dentarith elevates dental diagnostic documentation and clinical decision support.
            </p>
          </div>

          <div className="mt-14 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Diagnostic Dimension</th>
                  <th className="px-6 py-4">Conventional Free-Text Notes</th>
                  <th className="px-6 py-4 text-teal-800 font-bold bg-teal-50/50">Dentarith Clinical Copilot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="px-6 py-4 font-bold text-slate-900">Evidence Classification</td>
                  <td className="px-6 py-4 text-slate-500">Symptoms, tests, and assumptions mixed in free-text prose</td>
                  <td className="px-6 py-4 font-semibold text-teal-900 bg-teal-50/30">
                    Rigorous separation of Reported vs. Observed vs. Inferred data
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-bold text-slate-900">Differential Diagnoses</td>
                  <td className="px-6 py-4 text-slate-500">Rarely documented; usually only a single presumptive diagnosis recorded</td>
                  <td className="px-6 py-4 font-semibold text-teal-900 bg-teal-50/30">
                    Ranked differential hypotheses with supporting and contradicting observations
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-bold text-slate-900">Missing Information Alerts</td>
                  <td className="px-6 py-4 text-slate-500">Unrecorded tests are silent; easily overlooked during rapid appointments</td>
                  <td className="px-6 py-4 font-semibold text-teal-900 bg-teal-50/30">
                    Explicit prioritized missing-data alerts (Critical / Important / Useful)
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-bold text-slate-900">Tooth Numbering</td>
                  <td className="px-6 py-4 text-slate-500">Single local convention; prone to confusion in referrals</td>
                  <td className="px-6 py-4 font-semibold text-teal-900 bg-teal-50/30">
                    Bilingual Universal (#1-32) and FDI (11-48) mapping with arch &amp; quadrant validation
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-bold text-slate-900">Clinician Governance</td>
                  <td className="px-6 py-4 text-slate-500">No structured audit trail of why an AI suggestion was agreed with or modified</td>
                  <td className="px-6 py-4 font-semibold text-teal-900 bg-teal-50/30">
                    Formal Clinician Review Trace with timestamped clinician sign-off
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 9. CLINICAL GOVERNANCE & SAFETY GUARANTEES */}
      <section id="clinical-governance" className="border-t border-slate-200 bg-[#090d16] py-20 text-white sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-950/70 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-teal-300">
              <Icon name="shield" size={15} />
              <span>Clinical Responsibility &amp; Safety Guarantees</span>
            </div>
            <h2 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-5xl text-white">
              AI Assists. The Dentist Decides.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-300">
              Dentarith is engineered with strict clinical guardrails designed to empower dentists — never bypass them.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6">
              <div className="text-teal-400 font-bold text-sm">✓ Assistive Decision Support</div>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Dentarith provides diagnostic considerations for review. It does not issue treatment prescriptions or autonomously initiate therapy.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6">
              <div className="text-teal-400 font-bold text-sm">✓ Zero Radiographic Hallucination</div>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Automated computer vision is not active in this prototype. All radiographic statements derive strictly from clinician-entered observations.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6">
              <div className="text-teal-400 font-bold text-sm">✓ Unassessed ≠ Absent</div>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Unentered tests are strictly treated as missing or unperformed — never assumed to be negative or normal.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6">
              <div className="text-teal-400 font-bold text-sm">✓ Local-First &amp; Client Isolation</div>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Local-first workspace with optional authenticated cloud sync and strict client-side radiograph isolation (<code className="text-teal-300">radiograph: null</code>).
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6">
              <div className="text-teal-400 font-bold text-sm">✓ Schema Validation Enforced</div>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Every model response is rigorously validated by a typed Zod schema before being rendered as structured findings.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6">
              <div className="text-teal-400 font-bold text-sm">✓ Complete Decision Trace</div>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Every case provides a Clinician Review Trace recording whether the dentist confirmed, modified, or rejected the AI differential.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 10. CALL TO ACTION SECTION */}
      <section className="border-t border-slate-200 bg-gradient-to-b from-slate-50 to-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 text-center">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
              Elevate Your Dental Diagnostic Workflow.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">
              Experience explainable clinical decision support with interactive reference cases or launch a new case intake right now.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
              <Link
                href="/cases/new"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-7 text-sm font-bold text-white shadow-xs transition hover:bg-teal-800 sm:w-auto"
              >
                <span>Create New Clinical Case</span>
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/cases/demo"
                className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-7 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
              >
                Explore Benchmark Cases
              </Link>
              <Link
                href="/cases"
                className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
              >
                Open Workspace
              </Link>
            </div>

            <p className="mt-6 text-xs text-slate-400">
              Demonstration advisory: For testing and educational review, use synthetic or de-identified dental case data.
            </p>
          </div>
        </div>
      </section>

      {/* 11. FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-12 text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Logo size={32} />
              <div>
                <span className="font-extrabold text-slate-900 text-sm">Dentarith</span>
                <span className="ml-2 text-slate-300">|</span>
                <span className="ml-2 text-slate-600 font-medium">
                  Clinical Intelligence for Dentistry
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 text-slate-600 font-semibold">
              <a href="#overview" className="hover:text-teal-800 transition">Overview</a>
              <a href="#clinical-workflow" className="hover:text-teal-800 transition">Workflow</a>
              <a href="#interactive-preview" className="hover:text-teal-800 transition">Reasoning</a>
              <a href="#clinical-governance" className="hover:text-teal-800 transition">Safety</a>
              <Link href="/cases" className="hover:text-teal-800 transition">Workspace</Link>
              <Link href="/cases/new" className="text-teal-700 hover:text-teal-900 transition">New Case →</Link>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-slate-400 text-[11px]">
            <p>
              Dentarith is an assistive clinical decision-support copilot. It does not provide medical or dental advice directly to patients and does not replace qualified clinician judgment. All diagnoses, prescriptions, and treatments remain the sole legal responsibility of the licensed treating dentist.
            </p>
            <p className="shrink-0 font-medium">
              Domain: <a href="https://dentarith.me" className="text-slate-600 hover:underline">https://dentarith.me</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
