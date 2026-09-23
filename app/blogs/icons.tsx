import type { SVGProps } from "react";
import {
  LayoutGrid,
  Search,
  Plus,
  X,
  Heart,
  MessageCircle,
  Send,
} from "lucide-react";

/**
 * Thin wrappers around Lucide icons (https://lucide.dev) — a maintained,
 * MIT-licensed icon pack already used elsewhere in this project
 * (see blogcard.tsx). Each wrapper keeps the same self-contained
 * `group/icon` hover-animation pattern as before: whatever
 * button/element renders the icon, hovering it naturally hovers the
 * icon too, no `group` class needed on the parent.
 *
 * `fill-current` support (used for the liked-heart state) still works
 * the same way: Lucide's Heart renders with `fill="none"` by default,
 * and an author-stylesheet class like `fill-current` beats that
 * presentation attribute, so passing `className="... fill-current"`
 * fills it in.
 */

type IconProps = SVGProps<SVGSVGElement>;

export function GridDotsIcon({ className = "", ...props }: IconProps) {
  return (
    <LayoutGrid
      strokeWidth={1.8}
      className={`transition-transform duration-300 ease-out hover:scale-[0.9] ${className}`}
      {...props}
    />
  );
}

export function SearchIcon({ className = "", ...props }: IconProps) {
  return (
    <Search
      strokeWidth={1.8}
      className={`transition-transform duration-300 ease-out hover:scale-110 hover:rotate-6 ${className}`}
      {...props}
    />
  );
}

export function PlusIcon({ className = "", ...props }: IconProps) {
  return (
    <Plus
      strokeWidth={1.9}
      className={`transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:rotate-90 ${className}`}
      {...props}
    />
  );
}

export function CloseIcon({ className = "", ...props }: IconProps) {
  return (
    <X
      strokeWidth={1.9}
      className={`transition-transform duration-300 ease-out hover:rotate-90 ${className}`}
      {...props}
    />
  );
}

export function HeartIcon({ className = "", ...props }: IconProps) {
  return (
    <Heart
      strokeWidth={1.7}
      className={`transition-transform duration-200 ease-out hover:scale-110 active:scale-95 ${className}`}
      {...props}
    />
  );
}

export function CommentIcon({ className = "", ...props }: IconProps) {
  return (
    <MessageCircle
      strokeWidth={1.6}
      className={`transition-transform duration-200 ease-out hover:scale-[1.08] ${className}`}
      {...props}
    />
  );
}

export function ShareIcon({ className = "", ...props }: IconProps) {
  return (
    <Send
      strokeWidth={1.6}
      className={`transition-transform duration-300 ease-out hover:translate-x-[2px] hover:-translate-y-[2px] hover:rotate-[8deg] ${className}`}
      {...props}
    />
  );
}