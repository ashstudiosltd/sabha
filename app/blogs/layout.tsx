import type { Metadata } from "next";
import { Roboto as RobotoFont } from "next/font/google";

const Roboto = RobotoFont({
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Blogs",
};

export default function Blogs({ children }: LayoutProps<"/">) {
  return (
    <div className={`bg-[#F5F6F7] ${Roboto.className}`}>
      {children}
    </div>
  );
}