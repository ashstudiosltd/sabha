import type { SVGProps } from "react";


type IconProps = SVGProps<SVGSVGElement>;

const baseProps = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function HeartIcon({ className = "", ...props }: IconProps) {
  return (
    <svg
      {...baseProps}
      strokeWidth={1.8}
      className={`transition-transform duration-200 ease-out hover:scale-110 active:scale-95 ${className}`}
      {...props}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export function CommentIcon({ className = "", ...props }: IconProps) {
  return (
    <svg
      {...baseProps}
      strokeWidth={1.8}
      className={`transition-transform duration-200 ease-out hover:scale-[1.08] ${className}`}
      {...props}
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

export function ShareIcon({ className = "", ...props }: IconProps) {
  return (
    <svg
      {...baseProps}
      strokeWidth={1.8}
      className={`transition-transform duration-200 ease-out hover:scale-[1.08] ${className}`}
      {...props}
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

export function CloseIcon({ className = "", ...props }: IconProps) {
  return (
    <svg
      {...baseProps}
      strokeWidth={1.9}
      className={`transition-transform duration-200   ${className}`}
      {...props}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}