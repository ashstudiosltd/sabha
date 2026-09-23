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
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center"
      >
        <img
          src="/logo.png"
          alt="Devvrats"
          width={72}
          height={72}
          className="h-[72px] w-[72px] select-none object-contain"
          draggable={false}
        />

        <p className="mt-14 text-[28px] font-semibold leading-tight tracking-tight text-[#f5f5f7] sm:text-[32px]">
          Verifying connection…
        </p>

        <div
          aria-hidden="true"
          className="mt-14 h-10 w-10 animate-spin rounded-full border-[3px] border-white/15 border-b-[#2f7cf6] border-l-[#2f7cf6]"
          style={{
            animationDuration: "0.9s",
          }}
        />
      </div>
    );
  }

  return <>{children}</>;
}