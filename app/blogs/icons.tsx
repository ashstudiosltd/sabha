import type { SVGProps } from "react";

/**
 * Every icon below is a plain inline SVG — nothing pulled from an icon
 * library or a CDN. Each one wraps itself in a Tailwind *named* group
 * (`group/icon`) on its own root <svg>, so the hover micro-animation is
 * self-contained: whatever button/element renders the icon, hovering over
 * it naturally hovers the icon too, no `group` class needed on the parent.
 *
 * `fill-current` support (used for the liked-heart state) still works the
 * same way it did before: the heart path has `fill="none"` by default, and
 * an author-stylesheet class like `fill-current` beats that presentation
 * attribute, so passing `className="... fill-current"` fills it in.
 */

type IconProps = SVGProps<SVGSVGElement>;

const fillBox = { transformBox: "fill-box", transformOrigin: "center" } as const;

export function GridDotsIcon({ className = "", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`group/icon ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect
        x="3" y="3" width="8" height="8" rx="2.4"
        className="fill-current transition-transform duration-300 ease-out group-hover/icon:scale-[0.88]"
        style={fillBox}
      />
      <rect
        x="13" y="3" width="8" height="8" rx="2.4"
        className="fill-current transition-transform delay-[40ms] duration-300 ease-out group-hover/icon:scale-[0.88]"
        style={fillBox}
      />
      <rect
        x="3" y="13" width="8" height="8" rx="2.4"
        className="fill-current transition-transform delay-[80ms] duration-300 ease-out group-hover/icon:scale-[0.88]"
        style={fillBox}
      />
      <rect
        x="13" y="13" width="8" height="8" rx="2.4"
        className="fill-current transition-transform delay-[120ms] duration-300 ease-out group-hover/icon:scale-[0.88]"
        style={fillBox}
      />
    </svg>
  );
}

export function SearchIcon({ className = "", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`group/icon ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle
        cx="10.3" cy="10.3" r="6.3"
        stroke="currentColor"
        strokeWidth="1.8"
        className="transition-transform duration-300 ease-out group-hover/icon:scale-110"
        style={fillBox}
      />
      <path
        d="M15.1 15.1L20 20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        className="origin-[15.1px_15.1px] transition-transform duration-300 ease-out group-hover/icon:rotate-6"
      />
    </svg>
  );
}

export function PlusIcon({ className = "", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`group/icon ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g
        className="origin-center transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/icon:rotate-90"
        style={fillBox}
      >
        <path d="M12 5v14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        <path d="M5 12h14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function CloseIcon({ className = "", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`group/icon ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g
        className="origin-center transition-transform duration-300 ease-out group-hover/icon:rotate-90"
        style={fillBox}
      >
        <path d="M6 6l12 12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        <path d="M18 6L6 18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function HeartIcon({ className = "", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`group/icon ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M12 20.3c-.3 0-.6-.1-.8-.3C7.7 17.3 3 13.5 3 9.2 3 6.3 5.3 4 8.2 4c1.6 0 3.1.8 3.8 2.1C12.7 4.8 14.2 4 15.8 4 18.7 4 21 6.3 21 9.2c0 4.3-4.7 8.1-8.2 10.8-.2.2-.5.3-.8.3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
        className="origin-center transition-transform duration-200 ease-out group-hover/icon:scale-110 group-active/icon:scale-95"
        style={fillBox}
      />
    </svg>
  );
}

export function CommentIcon({ className = "", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`group/icon ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect
        x="3" y="4.5" width="18" height="12" rx="4"
        stroke="currentColor"
        strokeWidth="1.6"
        className="transition-transform duration-200 ease-out group-hover/icon:scale-[1.03]"
        style={fillBox}
      />
      <path
        d="M7.2 16.5L5 20.2l4.6-3.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="8.4" cy="10.5" r="1.05"
        className="fill-current transition-transform duration-300 ease-out group-hover/icon:-translate-y-[3px]"
        style={fillBox}
      />
      <circle
        cx="12" cy="10.5" r="1.05"
        className="fill-current transition-transform delay-75 duration-300 ease-out group-hover/icon:-translate-y-[3px]"
        style={fillBox}
      />
      <circle
        cx="15.6" cy="10.5" r="1.05"
        className="fill-current transition-transform delay-150 duration-300 ease-out group-hover/icon:-translate-y-[3px]"
        style={fillBox}
      />
    </svg>
  );
}

/**
 * Telegram-style "send" paper plane — a light filled body plus a fold
 * line for depth, matching the classic tilted-plane silhouette. On hover
 * it noses up and to the right as if taking off.
 */
export function ShareIcon({ className = "", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`group/icon overflow-visible ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g
        className="origin-center transition-transform duration-300 ease-out group-hover/icon:translate-x-[3px] group-hover/icon:-translate-y-[3px] group-hover/icon:rotate-[8deg]"
        style={fillBox}
      >
        <path
          d="M21.5 2.5 2.8 10.1c-.9.36-.86 1.65.06 1.96l6.03 2.02 2.02 6.03c.31.92 1.6.96 1.96.06L21.5 2.5Z"
          fill="currentColor"
          fillOpacity="0.14"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M21.5 2.5 9.6 14.4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}