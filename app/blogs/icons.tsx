// Small, dependency-free icon set used only within the blogs UI.
// Kept intentionally plain (single stroke weight) to match the restrained,
// editorial visual language — not a general-purpose icon library.

import type { SVGProps } from "react";

export function HeartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 20.5s-7.2-4.4-9.8-9C.6 8.1 2 4.5 5.6 4c2.1-.3 3.9.7 6.4 3.2C14.5 4.7 16.3 3.7 18.4 4c3.6.5 5 4.1 3.4 7.5-2.6 4.6-9.8 9-9.8 9Z" />
    </svg>
  );
}

export function CommentIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 4.5h16v12H8.5L4 20.5v-4H4v-12Z" />
    </svg>
  );
}

export function ShareIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 4v11" />
      <path d="M7.5 8.5 12 4l4.5 4.5" />
      <path d="M5 13.5v6h14v-6" />
    </svg>
  );
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.3-4.3" />
    </svg>
  );
}

// Icons used by the mobile bottom nav (four-dot grid, search, post, profile).

export function GridDotsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="7" cy="7" r="2.4" />
      <circle cx="17" cy="7" r="2.4" />
      <circle cx="7" cy="17" r="2.4" />
      <circle cx="17" cy="17" r="2.4" />
    </svg>
  );
}

export function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

export function ProfileIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M4.5 20c1.1-3.5 3.9-5.5 7.5-5.5s6.4 2 7.5 5.5" />
    </svg>
  );
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}