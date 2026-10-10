import type { Metadata } from "next";
import { Geist, Geist_Mono, Roboto } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Sabha",
  description: "A community for developers to share knowledge, collaborate on projects, and grow together.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
 return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable} ${roboto.variable}`}>
      <body className="relative text-white">
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
