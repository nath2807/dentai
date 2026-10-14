import { Suspense } from "react";
import type { Metadata } from "next";
import { AppShell } from "@/components/clinical-ui";
import { CaseDetailContent } from "./case-detail-content";

export const metadata: Metadata = {
  title: "Clinical Case Details | Dentarith",
  description: "Evidence-grounded dental decision support and diagnostic reasoning.",
};

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <AppShell activeItem="Clinical Cases">
          <div className="flex min-h-[300px] items-center justify-center text-xs text-slate-500">
            Loading case details...
          </div>
        </AppShell>
      }
    >
      <CaseDetailContent caseId={decodeURIComponent(id)} />
    </Suspense>
  );
}
