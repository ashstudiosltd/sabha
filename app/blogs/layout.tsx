import type { Metadata } from "next";
import { Roboto as RobotoFont } from "next/font/google";
import BlogNavbar from "@/app/blogs/blognav";

const Roboto = RobotoFont({
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Blogs",
};
export default function Blogs({ children }: LayoutProps<"/">) {
 return (
    <html lang="en" className="dark">
      <body className="relative text-white">
        {/* Page content */}
        <main className={`relative z-10 min-h-screen bg-[#F5F6F7] ${Roboto.className}`}>
           <BlogNavbar searchPath="/blogs" />
          {children}
        </main>
      </body>
    </html>
  );
}