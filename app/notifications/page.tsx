import { redirect } from "next/navigation";
import SabhaNavbar from "@/components/sabha/sabha-navbar";
import NotificationCenter from "@/components/sabha/notification-center";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=%2Fnotifications");
  return <main className="sabha-design"><SabhaNavbar section="feed" searchPath="/feed" /><NotificationCenter userId={user.id} fullPage /></main>;
}
