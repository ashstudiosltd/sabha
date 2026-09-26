"use client";

import React, { useRef, useEffect } from "react";
import {
  motion,
  useSpring,
  useMotionValue,
  type MotionValue,
} from "framer-motion";
import Link from "next/link";

// Reuse the funky letter logic for footer links
const FooterProximityLetter = ({
  char,
  mouseX,
  mouseY,
}: {
  char: string;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
}) => {
  const ref = useRef<HTMLSpanElement>(null);

  const scale = useSpring(1, {
    stiffness: 200,
    damping: 12,
  });

  const rotate = useSpring(0, {
    stiffness: 200,
    damping: 12,
  });

  useEffect(() => {
    const updatePosition = (curX: number, curY: number) => {
      if (!ref.current) return;

      const rect = ref.current.getBoundingClientRect();

      const dist = Math.sqrt(
        Math.pow(
          curX - (rect.left + rect.width / 2),
          2
        ) +
          Math.pow(
            curY - (rect.top + rect.height / 2),
            2
          )
      );

      if (dist < 80) {
        const power = (80 - dist) / 80;

        scale.set(1 + power * 0.2);

        rotate.set(
          power * (Math.random() > 0.5 ? 3 : -3)
        );
      } else {
        scale.set(1);
        rotate.set(0);
      }
    };

    const unsubscribeX = mouseX.on("change", (latestX: number) => {
      updatePosition(latestX, mouseY.get());
    });

    const unsubscribeY = mouseY.on("change", (latestY: number) => {
      updatePosition(mouseX.get(), latestY);
    });

    return () => {
      unsubscribeX();
      unsubscribeY();
    };
  }, [mouseX, mouseY, scale, rotate]);

  return (
    <motion.span
      ref={ref}
      style={{
        scale,
        rotate,
        display: "inline-block",
      }}
      className="will-change-transform"
    >
      {char === " " ? "\u00A0" : char}
    </motion.span>
  );
};

const siteLinks = [
  { label: "BLOGS", href: "/sabha/blogs" },
  { label: "FEED", href: "/sabha/feed" },
  { label: "PROJECTS", href: "/sabha/projects" },
];

const communityLinks = [
  { label: "Login", href: "/registration" },
  { label: "Sabha", href: "/registration" },
];

const socialLinks = [
  {
    label: "Instagram",
    d: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
  },
  {
    label: "Twitter",
    d: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
  {
    label: "GitHub",
    d: "M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z",
  },
  {
    label: "Reddit",
    d: "M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z",
  },
];

export default function Footer() {
  const mouseX = useMotionValue(-1000);
  const mouseY = useMotionValue(-1000);

  return (
    <footer
      onMouseMove={(e) => {
        mouseX.set(e.clientX);
        mouseY.set(e.clientY);
      }}
      onMouseLeave={() => {
        mouseX.set(-1000);
        mouseY.set(-1000);
      }}
      className="px-6 md:px-10 py-10 relative z-10"
      style={{
        borderTop: "0.5px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <p className="text-sm font-medium tracking-[0.18em] text-black mb-3">
              Sabha.
            </p>

            <p className="text-[13px] text-black leading-relaxed max-w-[200px]">
            Ultimate learning and community platform for developers.
            </p>
          </div>

          {/* Site Map */}
          <div>
            <p className="text-[11px] font-medium tracking-[2px] text-black uppercase mb-4">
              Site Map
            </p>

            <ul className="flex flex-col gap-2.5">
              {siteLinks.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-[13px] text-black hover:text-grey/70 transition-colors duration-150 no-underline block"
                  >
                    {l.label.split("").map((char, i) => (
                      <FooterProximityLetter
                        key={i}
                        char={char}
                        mouseX={mouseX}
                        mouseY={mouseY}
                      />
                    ))}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <p className="text-[11px] font-medium tracking-[2px] text-black uppercase mb-4">
              Community
            </p>

            <ul className="flex flex-col text-black gap-2.5">
              {communityLinks.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-[13px] tex-black hover:text-grey/70 transition-colors duration-150 no-underline"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <p className="text-[11px] font-medium tracking-[2px] text-black uppercase mb-4">
              Follow
            </p>

            <div className="flex flex-wrap text-black gap-3">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className="tex-black hover:text-grey/70 transition-colors duration-150"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d={s.d} />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div
          className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-6"
          style={{
            borderTop: "0.5px solid rgba(255,255,255,0.06)",
          }}
        >
          <p className="text-[11px] text-black">
            © 2024 Ashstudios. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}