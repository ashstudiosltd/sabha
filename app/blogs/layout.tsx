import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blogs",
};
export default function Blogs({ children }: LayoutProps<"/">) {
 return (
    <html lang="en" className="dark">
      <body className="relative text-white">
        {/* Gradient background only */}
        <div className="absolute inset-0 -z-10 bg-White" />
        
        {/* Page content */}
        <main className="relative z-10 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}