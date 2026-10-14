"use client";
import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { Activity, Compass, Folder, FolderCode, LayoutGrid } from "lucide-react";
import BackNavigation from "@/components/sabha/back-navigation";
import { createClient } from "@/lib/supabase/client";

interface WorkspaceUser { id: string; name: string; username: string | null; avatar: string | null }
const UserContext = createContext<{ user: WorkspaceUser | null; loading: boolean }>({ user: null, loading: true });
export function useWorkspaceUser() { return useContext(UserContext); }

export default function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const [identity, setIdentity] = useState<{ user: WorkspaceUser | null; loading: boolean }>({ user: null, loading: true });
  useEffect(() => {
    let active = true;
    const supabase = createClient();
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { if (active) setIdentity({ user: null, loading: false }); return; }
        const { data: profile } = await supabase.from("profiles").select("name, username, avatar_url").eq("id", user.id).maybeSingle();
        if (active) setIdentity({ user: { id: user.id, name: profile?.name || "Developer", username: profile?.username ?? null, avatar: profile?.avatar_url ?? null }, loading: false });
      } catch { if (active) setIdentity({ user: null, loading: false }); }
    };
    void load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { void load(); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  const mine = pathname === "/projects" && search.get("view") === "mine";
  const items = [
    { href: "/projects", label: "Explore projects", icon: Compass, active: pathname === "/projects" && !mine },
    { href: "/projects?view=mine", label: "Your workspace", icon: LayoutGrid, active: mine || pathname === "/projects/new" },
    { href: "/projects/activity", label: "Activity", icon: Activity, active: pathname === "/projects/activity" },
  ];
  return <UserContext.Provider value={identity}><div className="dv-workspace">
    <a href="#project-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-black focus:p-4">Skip to Projects content</a>
    <header className="dv-topbar"><Link href="/projects" className="dv-brand"><span className="dv-mark"><FolderCode size={19} /></span>Devvrats<span style={{ color: "var(--dv-subtle)", fontWeight: 400 }}> / Projects</span></Link><nav className="dv-toplinks" aria-label="Ecosystem"><a href="https://sabha.devvrats.in">Sabha</a><Link href={identity.user?.username ? `/profile/${identity.user.username}` : "/auth?next=%2Fprojects"}>{identity.user ? "Profile" : "Sign in"}</Link></nav></header>
    <div className="dv-frame"><aside className="dv-sidebar"><div className="dv-sidebar-inner"><p className="dv-eyebrow">Build your next chapter</p><nav className="dv-nav" aria-label="Projects">{items.map(({ href, label, icon: Icon, active }) => <Link key={href} href={href} aria-current={active ? "page" : undefined}><Icon size={16} />{label}</Link>)}</nav>
      <div className="dv-user"><span className="dv-avatar">{identity.user?.avatar ? <Image src={identity.user.avatar} alt="" width={38} height={38} unoptimized /> : <Folder size={16} />}</span><div style={{ minWidth: 0 }}><strong>{identity.loading ? "Your workspace" : identity.user?.name ?? "Welcome, developer"}</strong><small>{identity.user?.username ? `@${identity.user.username}` : "A place to build together"}</small></div></div>
    </div></aside><div id="project-content" className="dv-content">{pathname !== "/projects" && <BackNavigation fallback={pathname.endsWith("/edit") ? { href: pathname.slice(0, -5), label: "Back to project" } : { href: "/projects", label: "Back to Projects" }} />}{children}</div></div>
  </div></UserContext.Provider>;
}
