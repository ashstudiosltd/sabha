"use client";
import { createContext, useContext, useEffect, useState, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Activity, Compass, LayoutGrid } from "lucide-react";
import SabhaNavbar from "@/components/sabha/sabha-navbar";
import { createClient } from "@/lib/supabase/client";

interface WorkspaceUser { id: string; name: string; username: string | null; avatar: string | null }
const UserContext = createContext<{ user: WorkspaceUser | null; loading: boolean }>({ user: null, loading: true });
export function useWorkspaceUser() { return useContext(UserContext); }

export default function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const navbar = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element=navbar.current;if(!element)return;
    const update=()=>shell.current?.style.setProperty("--dv-nav-offset",`${Math.ceil(element.getBoundingClientRect().height)}px`);
    const observer=new ResizeObserver(update);observer.observe(element);update();return()=>observer.disconnect();
  },[]);
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
  const mine = pathname === "/projects/workspace" || (pathname === "/projects" && search.get("view") === "mine");
  const items = [
    { href: "/projects", label: "Explore projects", icon: Compass, active: pathname === "/projects" && !mine },
    { href: "/projects/workspace", label: "Your workspace", icon: LayoutGrid, active: mine || pathname === "/projects/new" },
    { href: "/projects/activity", label: "Your activity", icon: Activity, active: pathname === "/projects/activity" },
  ];
  return <UserContext.Provider value={identity}><div ref={shell} className="dv-workspace">
    <a href="#project-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-black focus:p-4">Skip to Projects content</a>
    <div ref={navbar} className="sabha-design dv-project-navbar"><SabhaNavbar key={pathname} section="projects" initialQuery={search.get("q")??""} searchPath={mine?"/projects/workspace":"/projects"} placeholder={mine?"Search your projects":"Search community projects"} action={{label:"New project",href:"/projects/new"}} signInHref={`/auth?next=${encodeURIComponent(pathname+(search.toString()?`?${search}`:""))}`} backFallback={
      pathname.endsWith("/github")?{href:pathname.slice(0,-7)+"?tab=development",label:"Back to Development"}:
      pathname.endsWith("/edit")?{href:pathname.slice(0,-5),label:"Back to project"}:
      pathname==="/projects/new"?{href:"/projects/workspace",label:"Back to workspace"}:
      pathname==="/projects/workspace"||pathname==="/projects/activity"?{href:"/projects",label:"Back to Explore"}:
      pathname==="/projects"?{href:"/",label:"Back to Sabha"}:
      search.has("tab")?{href:pathname,label:"Back to Overview"}:
      {href:identity.user?"/projects/workspace":"/projects",label:identity.user?"Back to workspace":"Back to Explore"}
    }/></div>
    <div className="dv-frame"><aside className="dv-sidebar"><div className="dv-sidebar-inner"><nav className="dv-nav" aria-label="Projects">{items.map(({ href, label, icon: Icon, active }) => <Link key={href} href={href} aria-current={active ? "page" : undefined}><Icon size={16} />{label}</Link>)}</nav>

    </div></aside><div id="project-content" className="dv-content">{children}</div></div>
  </div></UserContext.Provider>;
}
