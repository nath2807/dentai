import type { ReactNode } from "react";
import { WorkspaceBoundary } from "@/components/workspace-boundary";

export default function ReportsLayout({ children }: { children: ReactNode }) {
  return <WorkspaceBoundary>{children}</WorkspaceBoundary>;
}
