"use client";

import { useEffect, useState } from "react";

import ConnectionLoader from "@/app/components/connection-loader";

const STORAGE_KEY = "sabha:profile-loader-shown";
const DURATION = 2000;

/*
 * A `template.tsx` remounts on every navigation, so this runs each
 * time /profile/[username] or /profile/edit is opened.
 *
 * To stop the loader from replaying on every internal navigation, we
 * remember (in sessionStorage) that it already played once for this
 * browser tab/session. sessionStorage clears when the tab/browser is
 * closed, so the loader naturally "restarts" next time the user
 * actually revisits the site.
 */
export default function ProfileTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alreadyShown = false;
    try {
      alreadyShown = sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // sessionStorage unavailable (private mode etc.) — just show it.
    }

    if (alreadyShown) {
      setReady(true);
      return;
    }

    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {}
      setReady(true);
    }, DURATION);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {!ready && <ConnectionLoader />}
      <div className={ready ? undefined : "hidden"}>{children}</div>
    </>
  );
}