"use client";
import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FolderCode } from "lucide-react";
import "./workspace.css";

// Handle both Next links and project references rendered as ordinary anchors.
// React's pending state follows navigation; there is no artificial loading timer.
export default function ProjectsNavigation() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const navigate = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      const url = new URL(anchor.href, window.location.origin);
      const isProject = url.pathname === "/projects" || url.pathname.startsWith("/projects/") || url.pathname === "/sabha/projects" || url.pathname.startsWith("/sabha/projects/");
      if (url.origin !== window.location.origin || !isProject || url.href === window.location.href) return;
      event.preventDefault();
      startTransition(() => router.push(`${url.pathname}${url.search}${url.hash}`));
    };
    document.addEventListener("click", navigate, true);
    return () => document.removeEventListener("click", navigate, true);
  }, [router]);
  if (!pending) return null;
  return <div className="dv-workspace dv-navigation-overlay" role="status" aria-live="polite"><div className="dv-loader"><span className="dv-loader-symbol"><FolderCode size={32} /></span><span className="dv-pending-fade">Opening Projects</span></div></div>;
}
