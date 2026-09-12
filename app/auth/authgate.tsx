"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type AuthGateProps = {
  children: React.ReactNode;
};

export default function AuthGate({
  children,
}: AuthGateProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const supabase = createClient();

    let mounted = true;

    const checkSession =
      async () => {
        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        if (!session) {
          const next =
            `${pathname}${window.location.search}`;

          router.replace(
            `/auth?next=${encodeURIComponent(
              next
            )}`
          );

          return;
        }

        setLoading(false);
      };

    checkSession();

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!mounted) {
            return;
          }

          if (session) {
            setLoading(false);
          }
        }
      );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-sm text-white/60">
          Loading Sabha...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}