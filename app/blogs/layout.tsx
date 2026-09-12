import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blogs",
};
export default function SabhaLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return children;
}