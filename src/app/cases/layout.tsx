import type { ReactNode } from "react";
import { Suspense } from "react";
import { connection } from "next/server";
import { WorkspaceBoundary } from "@/components/workspace-boundary";

async function DynamicMarker() {
  await connection();
  return null;
}

export default function CasesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <DynamicMarker />
      </Suspense>
      <WorkspaceBoundary>{children}</WorkspaceBoundary>
    </>
  );
}
