"use client";

import { useEffect, useState } from "react";
import Logo from "./logo";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 w-full z-20 transition-all duration-500 text-white">
      <div
        className={`mx-auto flex items-center justify-between px-6 py-4 lg:px-16 
        max-w-6xl mt-4 rounded-2xl shadow-lg transition-all duration-500
        ${
          scrolled
            ? "backdrop-blur-lg border border-white/10"
            : "bg-transparent border-transparent"
        }`}
      >
        <div className="flex items-center gap-2">
          <Logo className="h-7 w-7 text-white" />
          <div className="flex flex-col">
            <span className="font-semibold text-lg tracking-wide">SABHA.</span>
            <span className="text-[10px] leading-none sm:text-xs">Powered by ANU. </span>
          </div>
        </div>

        <a
          href="https://t.me/+EiuR--gamdYjQ9"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2 border border-white/30 rounded-full px-5 py-2 text-sm hover:bg-white/10 transition backdrop-blur-sm"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4 origin-top group-hover:animate-bell-ring"
          >
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
          </svg>
          Get Usefull insights
        </a>
        <style jsx>{`
          @keyframes bell-ring {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(14deg); }
            75% { transform: rotate(-14deg); }
          }
          :global(.animate-bell-ring) {
            animation: bell-ring 0.6s ease-in-out infinite;
            animation-play-state: paused;
          }
          :global(.group:hover .animate-bell-ring) {
            animation-play-state: running;
          }
        `}</style>
      </div>
    </header>
  );
}