import type { Metadata } from "next";
import SabhaNavbar from "@/components/sabha/sabha-navbar";

export const metadata: Metadata = {
  title: "Blogs",
};

export default function BlogsLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <main
      className="sabha-design relative z-10"
    >
      <SabhaNavbar section="blogs" searchPath="/blogs" />
      {children}
    </main>
  );
}
