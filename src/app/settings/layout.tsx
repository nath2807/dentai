import type { ReactNode } from "react";
import { WorkspaceBoundary } from "@/components/workspace-boundary";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <WorkspaceBoundary>{children}</WorkspaceBoundary>;
}
