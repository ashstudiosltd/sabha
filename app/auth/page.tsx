"use client";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
function AuthContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const next = searchParams.get("next") || "/";
  const signInWithGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          next
        )}`,
      },
    });
    if (error) {
      console.error(error);
      setLoading(false);
    }
  };
  const signInWithGitHub = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          next
        )}`,
      },
    });
    if (error) {
      console.error(error);
      setLoading(false);
    }
  };
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.05] p-8 backdrop-blur-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold">
            Welcome to Sabha
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Sign in to continue to Devvrats Sabha.
          </p>
        </div>
        <div className="space-y-3">
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full rounded-lg bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-50"
          >
            {loading ? "Connecting..." : "Continue with Google"}
          </button>
          <button
            onClick={signInWithGitHub}
            disabled={loading}
            className="w-full rounded-lg bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15 disabled:opacity-50"
          >
            {loading ? "Connecting..." : "Continue with GitHub"}
          </button>
        </div>
        <p className="mt-6 text-center text-xs text-white/40">
          By continuing, you agree to the Devvrats community guidelines.
        </p>
      </div>
    </main>
  );
}
export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
          <div className="text-sm text-white/50">
            Loading...
          </div>
        </main>
      }
    >
      <AuthContent />
    </Suspense>
  );
}