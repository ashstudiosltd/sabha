import SabhaAnuCompanion from "@/components/sabha/anu-companion";
import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import ProjectsNavigation from "@/components/workspace/projects-navigation";
import { SabhaNavigationHistory } from "@/components/sabha/back-navigation";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sabha",
  description: "A community for developers to share knowledge, collaborate on projects, and grow together.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
 return (
    <html lang="en" className={`dark ${roboto.variable}`}>
      <body className="relative text-white">
        <SabhaNavigationHistory />
        <ProjectsNavigation />
        <SabhaAnuCompanion />
        {/* Gradient background only */}
        <div className="absolute inset-0 -z-10" />
        
        {/* Page content */}
        <main className="relative z-10 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
