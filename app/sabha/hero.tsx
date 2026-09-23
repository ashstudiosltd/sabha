"use client";

import React, { useRef, useEffect } from "react";
import Link from "next/link";
import {
  motion,
  useSpring,
  useMotionValue,
  type MotionValue,
} from "framer-motion";
import Footer from "@/app/sabha/footer";

type ProximityLetterProps = {
  char: string;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
};

const ProximityLetter = ({
  char,
  mouseX,
  mouseY,
}: ProximityLetterProps) => {
  const ref = useRef<HTMLSpanElement>(null);

  const scale = useSpring(1, {
    stiffness: 200,
    damping: 12,
  });

  const x = useSpring(0, {
    stiffness: 200,
    damping: 12,
  });

  const y = useSpring(0, {
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

      const charX = rect.left + rect.width / 2;
      const charY = rect.top + rect.height / 2;

      const dist = Math.sqrt(
        Math.pow(curX - charX, 2) +
          Math.pow(curY - charY, 2)
      );

      const radius = 150;

      if (dist < radius) {
        const power = (radius - dist) / radius;

        scale.set(1 + power * 0.4);

        const angle = Math.atan2(
          charY - curY,
          charX - curX
        );

        x.set(Math.cos(angle) * power * 8);
        y.set(Math.sin(angle) * power * 8);

        rotate.set(
          power * (Math.random() > 0.5 ? 5 : -5)
        );
      } else {
        scale.set(1);
        x.set(0);
        y.set(0);
        rotate.set(0);
      }
    };

    const unsubscribeX = mouseX.on(
      "change",
      (latestX: number) => {
        updatePosition(latestX, mouseY.get());
      }
    );

    const unsubscribeY = mouseY.on(
      "change",
      (latestY: number) => {
        updatePosition(mouseX.get(), latestY);
      }
    );

    return () => {
      unsubscribeX();
      unsubscribeY();
    };
  }, [mouseX, mouseY, scale, x, y, rotate]);

  return (
    <motion.span
      ref={ref}
      style={{
        scale,
        x,
        y,
        rotate,
        display: "inline-block",
      }}
      className="will-change-transform"
    >
      {char === " " ? "\u00A0" : char}
    </motion.span>
  );
};

type NavigationItemProps = {
  title: string;
  subtitle: string;
  href: string;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
};

const NavigationItem = ({
  title,
  subtitle,
  href,
  mouseX,
  mouseY,
}: NavigationItemProps) => (
  <Link
    href={href}
    className="group relative py-6 md:py-12 px-2 md:px-4 block transition-all duration-300"
  >
    <div className="absolute inset-0 bg-purple-600/0 group-hover:bg-purple-600/10 blur-3xl rounded-full transition-all duration-500 pointer-events-none" />

    <div className="relative z-10">
      <div className="text-4xl md:text-7xl font-black tracking-tighter mb-2 md:mb-3 text-white whitespace-nowrap">
        {title.split("").map((char, i) => (
          <ProximityLetter
            key={i}
            char={char}
            mouseX={mouseX}
            mouseY={mouseY}
          />
        ))}
      </div>

      <span className="block text-base md:text-xl font-medium opacity-40 group-hover:opacity-100 transition-all duration-500 translate-x-0 group-hover:translate-x-3 group-hover:text-purple-300">
        {subtitle}
      </span>
    </div>
  </Link>
);

export default function SabhaHero() {
  const mouseX = useMotionValue(-1000);
  const mouseY = useMotionValue(-1000);

  return (
    <>
      <section
        onMouseMove={(e) => {
          mouseX.set(e.clientX);
          mouseY.set(e.clientY);
        }}
        onMouseLeave={() => {
          mouseX.set(-1000);
          mouseY.set(-1000);
        }}
        className="relative min-h-screen w-full bg-transparent text-white flex flex-col justify-center px-4 sm:px-6 md:px-12 lg:px-24 overflow-hidden bg-gradient-to-b from-black via-gray-900 to-purple-950 opacity-90"
      >
        <div className="max-w-7xl mx-auto w-full relative z-10">
          <header className="mb-10 md:mb-40">
            <div className="flex flex-wrap items-end gap-x-2 md:gap-x-4">
              <h1 className="text-[13vw] sm:text-[11vw] md:text-[10vw] leading-[0.85] md:leading-[0.8] font-black tracking-tighter uppercase">
                Your
                <br />
                Sitemap
              </h1>

              <span className="text-sm sm:text-lg md:text-3xl font-light italic tracking-tight opacity-60 mb-1 sm:mb-2 md:mb-4">
                to sabha
              </span>
            </div>
          </header>

          <nav className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4 md:gap-16">
            <NavigationItem
              title="BLOGS"
              subtitle="Articles"
              href="/blogs"
              mouseX={mouseX}
              mouseY={mouseY}
            />

            <NavigationItem
              title="FEED"
              subtitle="Community"
              href="/sabha/feed"
              mouseX={mouseX}
              mouseY={mouseY}
            />

            <NavigationItem
              title="PROJECTS"
              subtitle="Build"
              href="/sabha/projects"
              mouseX={mouseX}
              mouseY={mouseY}
            />
          </nav>
        </div>
      </section>

      <Footer />
    </>
  );
}