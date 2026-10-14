import type { ReactNode } from "react";
import { WorkspaceBoundary } from "@/components/workspace-boundary";

export default function CasesLayout({ children }: { children: ReactNode }) {
  return <WorkspaceBoundary>{children}</WorkspaceBoundary>;
}
