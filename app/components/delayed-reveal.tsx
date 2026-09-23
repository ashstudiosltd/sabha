"use client";

import { useEffect, useState } from "react";

import ConnectionLoader from "./connection-loader";

type DelayedRevealProps = {
  children: React.ReactNode;
  /** How long the loader stays on screen, in ms. */
  duration?: number;
};

/*
 * Shows the loader for `duration` ms, then reveals the page.
 * Children are mounted immediately (just hidden), so the page
 * starts loading its own data while the loader is showing.
 */
export default function DelayedReveal({
  children,
  duration = 2000,
}: DelayedRevealProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(
      () => setReady(true),
      duration
    );

    return () => clearTimeout(timer);
  }, [duration]);

  return (
    <>
      {!ready && <ConnectionLoader />}

      <div className={ready ? undefined : "hidden"}>
        {children}
      </div>
    </>
  );
}