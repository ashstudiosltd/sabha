"use client";

import Nav from "@/app/sabha/nav";
import Hero from "@/app/sabha/hero";
import AuthGate from "./auth/authgate";

export default function LokPage() {
  return (
    <div style={{  minHeight: "100vh" }}>
      <AuthGate>
      <Nav />
      <Hero />
      </AuthGate>
    </div>
  );
}