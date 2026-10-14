import { Suspense } from "react";
import type { Metadata } from "next";
import WorkspaceShell from "@/components/workspace/workspace-shell";
import "@/components/workspace/workspace.css";

export const metadata: Metadata = { title: { default: "Projects · Devvrats", template: "%s · Devvrats Projects" }, description: "A home for projects, their people, and the work they build together." };
export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="dv-workspace"><div className="dv-loader" role="status">Opening Projects…</div></div>}><WorkspaceShell>{children}</WorkspaceShell></Suspense>;
}
