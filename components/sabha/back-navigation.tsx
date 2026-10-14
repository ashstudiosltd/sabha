"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { backDestination, NAVIGATION_STORAGE_KEY, resolveBackDestination, type BackDestination } from "@/lib/sabha/navigation";

function readVisited(): string[] {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(NAVIGATION_STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(-40) : [];
  } catch { return []; }
}

function NavigationTracker() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    const href = pathname + (search ? `?${search}` : "");
    if (pathname.startsWith("/auth")) return;
    const visited = readVisited();
    const last = visited.at(-1);
    if (last?.split("?")[0] === pathname) visited.pop();
    visited.push(href);
    try { sessionStorage.setItem(NAVIGATION_STORAGE_KEY, JSON.stringify(visited.slice(-40))); } catch { /* Navigation still works without storage. */ }
  }, [pathname, search]);
  return null;
}

export function SabhaNavigationHistory() {
  return <Suspense fallback={null}><NavigationTracker /></Suspense>;
}

interface BackNavigationProps { fallback?: BackDestination; className?: string }
function BackNavigationLink({ fallback, className = "" }: BackNavigationProps) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [resolved, setResolved] = useState<BackDestination | null>(null);
  const base = fallback ?? backDestination(pathname, search);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setResolved(resolveBackDestination(pathname, search, readVisited(), fallback)));
    return () => cancelAnimationFrame(frame);
  }, [pathname, search, fallback]);
  const destination = resolved ?? base;
  return <Link href={destination.href} className={`sabha-back-link ${className}`}><ArrowLeft size={15} aria-hidden="true" /><span>{destination.label}</span></Link>;
}

export default function BackNavigation(props: BackNavigationProps) {
  const pathname = usePathname();
  const fallback = props.fallback ?? backDestination(pathname);
  return <Suspense fallback={<Link href={fallback.href} className={`sabha-back-link ${props.className ?? ""}`}><ArrowLeft size={15} aria-hidden="true" /><span>{fallback.label}</span></Link>}><BackNavigationLink {...props} /></Suspense>;
}
