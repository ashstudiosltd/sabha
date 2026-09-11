import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sabha",
  description: "A community for developers to share knowledge, collaborate on projects, and grow together.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
 return (
    <html lang="en" className="dark">
      <body className="relative text-white">
        {/* Gradient background only */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black via-gray-900 to-purple-950 opacity-90" />
        
        {/* Page content */}
        <main className="relative z-10 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
