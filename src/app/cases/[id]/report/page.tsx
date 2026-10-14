import { Suspense } from "react";
import type { Metadata } from "next";
import { ClinicalReportContent } from "./report-content";

export const metadata: Metadata = {
  title: "Clinical Decision Support Report | Dentarith",
  description: "Comprehensive printable dental assessment and decision trace.",
};

export default async function ClinicalReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-xs text-slate-500">
          Loading clinical report...
        </div>
      }
    >
      <ClinicalReportContent caseId={decodeURIComponent(id)} />
    </Suspense>
  );
}
