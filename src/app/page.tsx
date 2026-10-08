"use client";

import { useState } from "react";
import Link from "next/link";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased selection:bg-teal-100 selection:text-teal-900">
      {/* 1. NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 sm:px-8 lg:px-12">
          {/* Logo & Descriptor */}
          <Link href="/" className="group flex items-center gap-3.5 focus:outline-none">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm transition group-hover:bg-teal-800">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M7.5 4.5c1.5-1.2 2.8-.8 4.5 0 1.7-.8 3-.9 4.5 0 2.4 1.5 2.2 4.4 1.5 6.8-.7 2.5-1.4 5.7-3.1 6.2-1.8.6-1.8-3-2.9-3s-1.1 3.6-2.9 3C7.4 17 6.7 13.8 6 11.3 5.3 8.9 5.1 6 7.5 4.5Z" />
                <path d="M12 4.5V14" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-slate-950">
                Dentarith
              </span>
              <span className="hidden text-[11px] font-medium tracking-wide text-teal-800 sm:inline-block">
                Clinical Intelligence for Dentistry
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            <a
              href="#problem"
              className="text-sm font-medium text-slate-600 transition hover:text-teal-800"
            >
              About
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-slate-600 transition hover:text-teal-800"
            >
              How It Works
            </a>
            <a
              href="#capabilities"
              className="text-sm font-medium text-slate-600 transition hover:text-teal-800"
            >
              Product
            </a>
            <a
              href="#safety"
              className="text-sm font-medium text-slate-600 transition hover:text-teal-800"
            >
              Safety
            </a>
            <Link
              href="/cases"
              className="text-sm font-medium text-slate-600 transition hover:text-teal-800"
            >
              Workspace
            </Link>
          </nav>

          {/* Action CTAs */}
          <div className="hidden items-center gap-4 md:flex">
            <Link
              href="/cases/demo"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:border-teal-500 hover:text-teal-800"
            >
              View Demo Case
            </Link>
            <Link
              href="/cases/new"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 text-xs font-semibold text-white shadow-xs transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
            >
              <span>Try Dentarith</span>
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
            {mobileMenuOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="border-b border-slate-200 bg-white px-6 py-6 shadow-lg md:hidden">
            <nav className="flex flex-col space-y-4">
              <a
                href="#problem"
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-medium text-slate-700 hover:text-teal-800"
              >
                About
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-medium text-slate-700 hover:text-teal-800"
              >
                How It Works
              </a>
              <a
                href="#capabilities"
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-medium text-slate-700 hover:text-teal-800"
              >
                Product
              </a>
              <a
                href="#safety"
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-medium text-slate-700 hover:text-teal-800"
              >
                Safety
              </a>
              <Link
                href="/cases"
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-medium text-slate-700 hover:text-teal-800"
              >
                Clinical Workspace
              </Link>
              <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                <Link
                  href="/cases/demo"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-11 items-center justify-center rounded-lg border border-slate-300 text-sm font-semibold text-slate-700"
                >
                  View Demo Case
                </Link>
                <Link
                  href="/cases/new"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-11 items-center justify-center rounded-lg bg-teal-700 text-sm font-semibold text-white"
                >
                  Try Dentarith →
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white py-16 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-teal-50 px-3.5 py-1 text-xs font-semibold tracking-wider text-teal-900 uppercase">
              <span className="flex h-2 w-2 rounded-full bg-teal-600 animate-pulse" />
              AI-Powered Clinical Decision Support
            </div>

            {/* Headline */}
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-6xl sm:leading-[1.12]">
              Clinical Intelligence for Dentistry.
            </h1>

            {/* Subheadline */}
            <p className="mt-6 text-lg leading-relaxed text-slate-600 sm:text-xl">
              Dentarith helps dentists turn structured clinical findings into explainable
              diagnostic reasoning, differential considerations, missing-information checks, and
              treatment considerations — while keeping the dentist in control.
            </p>

            {/* CTAs */}
            <div className="mt-9 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
              <Link
                href="/cases/new"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-7 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 sm:w-auto"
              >
                <span>Try Dentarith</span>
                <span aria-hidden="true">→</span>
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-7 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 sm:w-auto"
              >
                See How It Works
              </a>
              <Link
                href="/cases/demo"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50/60 px-6 text-sm font-semibold text-teal-900 transition hover:bg-teal-100 sm:w-auto"
              >
                Sample Case
              </Link>
            </div>

            {/* Small trust/safety line */}
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-700" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Assistive clinical decision support. Dentist remains responsible for clinical decisions.</span>
            </div>
          </div>

          {/* Interactive Hero UI Card Preview */}
          <div className="mt-14 mx-auto max-w-5xl rounded-2xl border border-slate-200/90 bg-white p-3 shadow-[0_20px_50px_rgba(15,23,42,0.08)] sm:p-5">
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 sm:p-6">
              {/* Window Header */}
              <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5" aria-hidden="true">
                    <div className="h-3 w-3 rounded-full bg-slate-300" />
                    <div className="h-3 w-3 rounded-full bg-slate-300" />
                    <div className="h-3 w-3 rounded-full bg-slate-300" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    Dentarith Clinical Copilot — Reasoning Preview
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-semibold text-teal-800">
                  <span className="rounded-md bg-teal-100/80 px-2 py-0.5">Tooth #19</span>
                  <span className="rounded-md bg-emerald-100/80 text-emerald-800 px-2 py-0.5">Evidence Mapped</span>
                  <span className="rounded-md bg-blue-100/80 text-blue-800 px-2 py-0.5">Non-Autonomous</span>
                </div>
              </div>

              {/* 3-Column Preview Grid */}
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {/* Col 1: Findings Input */}
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                    Reported &amp; Observed Findings
                  </p>
                  <div className="mt-3 space-y-2 text-xs">
                    <div className="rounded-lg bg-slate-50 p-2.5">
                      <span className="font-semibold text-slate-700">Symptoms:</span>
                      <p className="text-slate-600 mt-0.5">Spontaneous, nocturnal throbbing pain in lower left quadrant.</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2.5">
                      <span className="font-semibold text-slate-700">Sensibility (Cold):</span>
                      <p className="text-slate-600 mt-0.5">Severe sharp response lingering 45s (control #20: 2s normal).</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2.5">
                      <span className="font-semibold text-slate-700">Periapical Tests:</span>
                      <p className="text-slate-600 mt-0.5">Percussion positive (+); palpation normal (-); no sinus tract.</p>
                    </div>
                  </div>
                </div>

                {/* Col 2: Ranked Hypotheses */}
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                    Ranked Diagnostic Considerations
                  </p>
                  <div className="mt-3 space-y-2.5 text-xs">
                    <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-950">#1 Symptomatic Irreversible Pulpitis</span>
                        <span className="rounded-full bg-teal-100 text-[10px] font-bold text-teal-900 px-2 py-0.2">High</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-600">
                        Prolonged thermal reaction (45s) is clinically diagnostic of irreversible inflammation.
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">#2 Symptomatic Apical Periodontitis</span>
                        <span className="rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700 px-2 py-0.2">Secondary</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-600">
                        Positive percussion indicates extension of inflammation into apical PDL.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Col 3: Missing Info & Governance */}
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    Missing Information &amp; Checks
                  </p>
                  <div className="mt-3 space-y-2.5 text-xs">
                    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2.5">
                      <span className="font-bold text-amber-950">Critical Gap:</span>
                      <p className="text-amber-900 text-[11px] mt-0.5">
                        No periapical radiograph recorded. Periapical bony status and root anatomy unconfirmed.
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                      <span className="font-bold text-slate-800">Decision-Changing Evidence:</span>
                      <p className="text-slate-600 text-[11px] mt-0.5">
                        PA showing periapical radiolucency would indicate pulpal necrosis with apical abscess.
                      </p>
                    </div>
                    <div className="pt-1 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Clinician Authority:</span>
                      <span className="font-semibold text-teal-800">Pending Dentist Review</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PROBLEM SECTION */}
      <section id="problem" className="border-t border-slate-200/70 bg-slate-50/50 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-800">
              The Clinical Challenge
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Clinical reasoning shouldn&apos;t start with a blank page.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Dental cases involve multiple complex findings across history, pain characteristics,
              pulp sensibility, periapical tissues, periodontal measurements, hard tissues, and soft tissues.
            </p>
            <p className="mt-2 text-base leading-relaxed text-slate-600">
              Dentarith helps dentists organize those dispersed findings into a structured reasoning workflow —
              without ever pretending to replace human clinical judgment.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xs">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-800 font-bold text-sm">
                01
              </div>
              <h3 className="mt-5 text-base font-bold text-slate-950">
                Dispersed Diagnostic Clues
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Patient complaints, cold tests, biting sensitivity, probing depths, and restorative history
                are frequently captured in fragments, making comprehensive synthesis challenging during back-to-back appointments.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xs">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-800 font-bold text-sm">
                02
              </div>
              <h3 className="mt-5 text-base font-bold text-slate-950">
                Implicit Mental Models
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Crucial diagnostic differentials often remain inside the clinician&apos;s head instead of being explicitly
                documented and compared against conflicting evidence or atypical clinical presentations.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xs">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-800 font-bold text-sm">
                03
              </div>
              <h3 className="mt-5 text-base font-bold text-slate-950">
                Overlooked Information Gaps
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Missing a crucial control tooth test, unrecorded EPT, or unconfirmed periapical radiograph can lead to
                premature diagnostic closure. Dentarith makes missing evidence transparent.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section id="how-it-works" className="border-t border-slate-200/80 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-800">
              Clinical Pipeline
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              From clinical findings to structured reasoning.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              A transparent, 4-step decision-support pipeline designed to elevate clinical rigor.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Step 1 */}
            <div className="relative rounded-2xl border border-slate-200 bg-slate-50/50 p-6 transition hover:border-teal-500 hover:bg-white">
              <span className="text-xs font-black tracking-widest text-teal-700 uppercase">
                01 — Capture
              </span>
              <h3 className="mt-3 text-base font-bold text-slate-950">
                Record Clinical Findings
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Record the patient&apos;s reported symptoms, medical &amp; dental history, vitality tests, percussion, probing, and tissue findings.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative rounded-2xl border border-slate-200 bg-slate-50/50 p-6 transition hover:border-teal-500 hover:bg-white">
              <span className="text-xs font-black tracking-widest text-teal-700 uppercase">
                02 — Structure
              </span>
              <h3 className="mt-3 text-base font-bold text-slate-950">
                Separate Evidence Types
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Separate reported patient findings, objective clinical observations, and AI-inferred interpretations for total traceability.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative rounded-2xl border border-slate-200 bg-slate-50/50 p-6 transition hover:border-teal-500 hover:bg-white">
              <span className="text-xs font-black tracking-widest text-teal-700 uppercase">
                03 — Reason
              </span>
              <h3 className="mt-3 text-base font-bold text-slate-950">
                Explore Hypotheses
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Generate ranked diagnostic considerations, supporting findings, contradicting evidence, and missing-information checks.
              </p>
            </div>

            {/* Step 4 */}
            <div className="relative rounded-2xl border border-slate-200 bg-slate-50/50 p-6 transition hover:border-teal-500 hover:bg-white">
              <span className="text-xs font-black tracking-widest text-teal-700 uppercase">
                04 — Review
              </span>
              <h3 className="mt-3 text-base font-bold text-slate-950">
                Dentist Decides
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                The treating dentist reviews the reasoning, diagnostic uncertainty, and treatment considerations before making the final decision.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PRODUCT CAPABILITIES */}
      <section id="capabilities" className="border-t border-slate-200/80 bg-slate-50/40 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-800">
              Dentarith Capabilities
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Built around clinical reasoning.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Purpose-built tools designed to support dental differential diagnosis and evidence traceability.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Card 1 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-800">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                </svg>
              </div>
              <h3 className="mt-5 text-base font-bold text-slate-950">Structured Case Review</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Organize dental findings into a consistent clinical workflow across symptoms, dental history, objective examinations, and vitality tests.
              </p>
            </div>

            {/* Card 2 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-800">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 3-1.2 5.8L5 10l5.8 1.2L12 17l1.2-5.8L19 10l-5.8-1.2z" />
                </svg>
              </div>
              <h3 className="mt-5 text-base font-bold text-slate-950">Explainable Reasoning</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Show exactly which clinical findings support each diagnostic consideration, and why the leading hypothesis ranks highest.
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-800">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                </svg>
              </div>
              <h3 className="mt-5 text-base font-bold text-slate-950">Differential Diagnosis</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Compare alternatives side-by-side, evaluating supporting observations, contradicting evidence, and what test would re-rank them.
              </p>
            </div>

            {/* Card 4 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-800">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
              </div>
              <h3 className="mt-5 text-base font-bold text-slate-950">Missing Information</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Highlight critical investigations (such as periapical radiographs or control tooth testing) that could alter the diagnostic ranking.
              </p>
            </div>

            {/* Card 5 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-800">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3 className="mt-5 text-base font-bold text-slate-950">Clinical Uncertainty</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Make diagnostic uncertainty explicit rather than hiding it, respecting the physiological limits of sensory pulp tests.
              </p>
            </div>

            {/* Card 6 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-800">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <path d="M6 14h12v8H6z" />
                </svg>
              </div>
              <h3 className="mt-5 text-base font-bold text-slate-950">Professional Reports</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Generate structured, printable clinical decision reports with signature blocks for case records and referrals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SAFETY SECTION */}
      <section id="safety" className="border-t border-slate-200/80 bg-slate-950 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-950/70 px-3.5 py-1 text-xs font-semibold tracking-wider text-teal-400 uppercase">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Clinical Governance &amp; Responsibility
            </div>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl text-white">
              AI assists. The dentist decides.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-300">
              Dentarith is engineered with uncompromising guardrails to support — never supplant — qualified dental professionals.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6">
              <div className="text-teal-400 font-bold text-sm">✓ Assistive Decision Support</div>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Dentarith is clinical decision-support software. It does not replace professional clinical judgment.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6">
              <div className="text-teal-400 font-bold text-sm">✓ Qualified Review Required</div>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                AI-generated conclusions must always be reviewed, verified, and validated by a licensed dental professional.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6">
              <div className="text-teal-400 font-bold text-sm">✓ No Assumed Negatives</div>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Unreported findings are treated strictly as unassessed — never assumed to be absent or normal.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6">
              <div className="text-teal-400 font-bold text-sm">✓ Zero Fabrication Rule</div>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Dentarith must not fabricate clinical or radiographic findings; reasoning is grounded solely in entered data.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6">
              <div className="text-teal-400 font-bold text-sm">✓ Non-Autonomous Orders</div>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Treatment considerations are options for clinician review, never autonomous prescriptions or treatment directives.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6">
              <div className="text-teal-400 font-bold text-sm">✓ MVP Scope Integrity</div>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                The current MVP is not a substitute for validated medical diagnostic systems or regulatory-certified EHRs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. CURRENT MVP SECTION */}
      <section className="border-t border-slate-200/80 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-800">
              Transparency &amp; Scope
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Built for dentists. Designed to evolve.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Dentarith is an actively developed clinical decision copilot. Here is what is live and functional today in our MVP:
            </p>
          </div>

          <div className="mt-14 mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-slate-50/60 p-6 sm:p-8">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-lg bg-white p-3 border border-slate-200/70 text-xs font-medium text-slate-800">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 font-bold text-[10px]">✓</span>
                Structured dental case intake (15 clinical sections)
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-white p-3 border border-slate-200/70 text-xs font-medium text-slate-800">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 font-bold text-[10px]">✓</span>
                Clinical reasoning engine with Gemini structured outputs
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-white p-3 border border-slate-200/70 text-xs font-medium text-slate-800">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 font-bold text-[10px]">✓</span>
                Differential diagnosis &amp; ranked hypotheses
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-white p-3 border border-slate-200/70 text-xs font-medium text-slate-800">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 font-bold text-[10px]">✓</span>
                Evidence traceability (Reported vs Observed vs Inferred)
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-white p-3 border border-slate-200/70 text-xs font-medium text-slate-800">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 font-bold text-[10px]">✓</span>
                Missing-information checks &amp; decision-changing criteria
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-white p-3 border border-slate-200/70 text-xs font-medium text-slate-800">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 font-bold text-[10px]">✓</span>
                Client-side case storage &amp; stale-analysis protection
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-white p-3 border border-slate-200/70 text-xs font-medium text-slate-800">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 font-bold text-[10px]">✓</span>
                Professional printable clinical decision reports (PDF export)
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-white p-3 border border-slate-200/70 text-xs font-medium text-slate-800">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 font-bold text-[10px]">✓</span>
                Local browser-based workflow with zero cloud patient tracking
              </div>
            </div>

            {/* Clear Boundary Notice */}
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-950">
              <span className="text-amber-800 font-bold text-sm shrink-0">⚠️</span>
              <div>
                <span className="font-bold">Radiographic AI Notice:</span> Automated radiograph image analysis is not currently implemented in this MVP. Radiographic interpretations in Dentarith are derived strictly from clinician-entered radiographic descriptions and observations.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. CTA SECTION */}
      <section className="border-t border-slate-200/80 bg-gradient-to-b from-slate-50 to-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 text-center">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
              Bring structured intelligence into your clinical workflow.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">
              Explore the Dentarith Clinical Copilot with a synthetic dental case or start a new clinical assessment now.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/cases/new"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-7 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 sm:w-auto"
              >
                <span>Try Dentarith</span>
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/cases/demo"
                className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-7 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
              >
                Explore Demo Case
              </Link>
              <Link
                href="/cases"
                className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
              >
                Open Clinical Workspace
              </Link>
            </div>

            <p className="mt-6 text-xs text-slate-400">
              Testing advisory: For demonstration and MVP testing, use synthetic or appropriately de-identified clinical information.
            </p>
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-12 text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
            {/* Logo & Tagline */}
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-white">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7.5 4.5c1.5-1.2 2.8-.8 4.5 0 1.7-.8 3-.9 4.5 0 2.4 1.5 2.2 4.4 1.5 6.8-.7 2.5-1.4 5.7-3.1 6.2-1.8.6-1.8-3-2.9-3s-1.1 3.6-2.9 3C7.4 17 6.7 13.8 6 11.3 5.3 8.9 5.1 6 7.5 4.5Z" />
                  <path d="M12 4.5V14" />
                </svg>
              </div>
              <div>
                <span className="font-bold text-slate-900 text-sm">Dentarith</span>
                <span className="ml-2 text-slate-400">|</span>
                <span className="ml-2 text-slate-600">Clinical Intelligence for Dentistry</span>
              </div>
            </div>

            {/* Links */}
            <div className="flex flex-wrap gap-6 text-slate-600 font-medium">
              <a href="#problem" className="hover:text-teal-800 transition">About</a>
              <a href="#how-it-works" className="hover:text-teal-800 transition">How It Works</a>
              <a href="#capabilities" className="hover:text-teal-800 transition">Product</a>
              <a href="#safety" className="hover:text-teal-800 transition">Safety</a>
              <Link href="/cases" className="hover:text-teal-800 transition">Workspace</Link>
              <Link href="/cases/new" className="text-teal-700 font-semibold hover:text-teal-800 transition">Try Dentarith →</Link>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-slate-400 text-[11px]">
            <p>
              Dentarith is an assistive clinical decision-support tool. It does not replace professional dental judgment. All diagnoses and clinical care decisions remain the sole responsibility of the treating clinician.
            </p>
            <p className="shrink-0">
              Domain: <a href="https://dentarith.me" className="text-slate-600 hover:underline">https://dentarith.me</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
