"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AuthGateProps = {
  children: React.ReactNode;
};

export default function AuthGate({ children }: AuthGateProps) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setAuthenticated(!!session);
      setLoading(false);
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-sm text-white/60">
          Loading Sabha...
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="w-full max-w-md px-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-8 backdrop-blur-xl">
            <h1 className="text-2xl font-semibold">
              Welcome to Sabha
            </h1>

            <p className="mt-2 text-sm text-white/60">
              Sign in or create your Devvrats account to continue.
            </p>

            <a
              href="/register"
              className="mt-6 block w-full rounded-lg bg-white px-4 py-3 text-center text-sm font-medium text-black transition hover:bg-white/90"
            >
              Continue to Sabha
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}