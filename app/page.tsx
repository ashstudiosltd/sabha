"use client";

import Nav from "@/app/sabha/nav";
import Hero from "@/app/sabha/hero";
import AuthGate from "./auth/authgate";

export default function LokPage() {
  return (
    <div className="bg-gradient-to-b from-black via-gray-900 to-purple-950 opacity-90" style={{ minHeight: "100vh" }}>
      <AuthGate>
      <Nav />
      <Hero />
      </AuthGate>
    </div>
  );
}