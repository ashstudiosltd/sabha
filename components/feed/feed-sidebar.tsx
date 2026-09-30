import type { ReactNode } from "react";
import Link from "next/link";

interface SidebarClan {
  id: string;
  slug: string;
  name: string;
  avatar_url?: string | null;
}

interface SidebarProjectItem {
  id: string;
  project?: { title: string } | null;
}

interface SidebarConversationItem {
  id: string;
  conversation?: { content: string } | null;
}

interface FeedSidebarProps {
  clans: SidebarClan[];
  projects: SidebarProjectItem[];
  conversations: SidebarConversationItem[];
  /** How many rows to show per section (default 5). */
  limit?: number;
}

function SidebarSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-[11.5px] font-medium tracking-[0.08em] text-black">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const rowClass =
  "block truncate py-1 text-[13px] text-black transition-colors hover:text-[#0066cc]";

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-[12.5px] text-[#86868b]">{children}</p>;
}

export default function FeedSidebar({
  clans,
  projects,
  conversations,
  limit = 5,
}: FeedSidebarProps) {
  return (
    <aside className="hidden bg-transparent lg:sticky lg:top-[78px] lg:block lg:space-y-5 lg:self-start">
      {/* Clans joined */}
      <SidebarSection
        title="Clans joined"
        action={
          <Link
            href="/clans"
            className="text-[12px] text-[#6e6e73] transition-colors hover:text-[#0066cc]"
          >
            View all
          </Link>
        }
      >
        {clans.length === 0 ? (
          <Empty>
            You haven&apos;t joined any clans yet.{" "}
            <Link href="/clans" className="underline underline-offset-2">
              Explore
            </Link>
          </Empty>
        ) : (
          <ul className="space-y-1">
            {clans.slice(0, limit).map((clan) => (
              <li key={clan.id}>
                <Link
                  href={`/clan/${clan.slug}`}
                  className="flex items-center gap-2.5 py-1 text-[13px] text-black transition-colors hover:text-[#0066cc]"
                >
                  <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#f2f2f2] text-[11px] font-semibold text-[#6e6e73]">
                    {clan.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={clan.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      clan.name.charAt(0).toUpperCase()
                    )}
                  </span>
                  <span className="truncate">{clan.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SidebarSection>

      <div className="border-t border-[#E5E1D8]" />

      {/* Current projects */}
      <SidebarSection title="Current projects">
        {projects.length === 0 ? (
          <Empty>No projects yet.</Empty>
        ) : (
          <ul>
            {projects.slice(0, limit).map((item) => (
              <li key={item.id}>
                <a href={`#post-${item.id}`} className={rowClass}>
                  {item.project?.title}
                </a>
              </li>
            ))}
          </ul>
        )}
      </SidebarSection>

      <div className="border-t border-[#E5E1D8]" />

      {/* Recent conversations */}
      <SidebarSection title="Recent conversations">
        {conversations.length === 0 ? (
          <Empty>Sabha is quiet.</Empty>
        ) : (
          <ul>
            {conversations.slice(0, limit).map((item) => (
              <li key={item.id}>
                <a href={`#post-${item.id}`} className={rowClass}>
                  {item.conversation?.content}
                </a>
              </li>
            ))}
          </ul>
        )}
      </SidebarSection>
    </aside>
  );
}