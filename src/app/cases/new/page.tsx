import { AppShell } from "@/components/clinical-ui";
import CaseForm from "./case-form";

export default function NewCasePage() {
  return (
    <AppShell activeItem="New Case">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">Clinical workspace / New case</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">New Clinical Case</h1>
          <p className="mt-2 max-w-2xl text-base leading-7 text-slate-500">Capture the clinical picture in one structured workspace. Complete what is relevant to your assessment.</p>
        </div>
        <CaseForm />
      </div>
    </AppShell>
  );
}
