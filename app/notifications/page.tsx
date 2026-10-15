import { Suspense } from "react";
import { redirect } from "next/navigation";
import SabhaNavbar from "@/components/sabha/sabha-navbar";
import NotificationCenter from "@/components/sabha/notification-center";
import WorkspaceShell from "@/components/workspace/workspace-shell";
import { createClient } from "@/lib/supabase/server";
import "@/components/workspace/workspace.css";
export const dynamic="force-dynamic";
export default async function NotificationsPage({searchParams}:{searchParams:Promise<{area?:string}>}) {
 const {area:requested}=await searchParams;const area=requested==="projects"?"projects":requested==="blogs"?"blogs":"feed";
 const db=await createClient();const {data:{user}}=await db.auth.getUser();
 if(!user)redirect(`/auth?next=${encodeURIComponent(`/notifications?area=${area}`)}`);
 if(area==="projects")return <Suspense fallback={<div className="dv-workspace dv-loader">Opening notifications…</div>}><WorkspaceShell><NotificationCenter userId={user.id} fullPage area="projects"/></WorkspaceShell></Suspense>;
 return <main className="sabha-design"><SabhaNavbar section={area} searchPath={`/${area}`}/><NotificationCenter userId={user.id} fullPage area={area}/></main>;
}
