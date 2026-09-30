import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { getClanBySlug } from "@/lib/supabase/clans";
import ClanSettings from "@/components/clans/clan-settings";

type ClanSettingsPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const pageClass =
  "min-h-screen bg-[#f5f5f7] font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',Helvetica,Arial,sans-serif]";

export default async function ClanSettingsPage({
  params,
}: ClanSettingsPageProps) {
  const { slug } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const clan = await getClanBySlug(slug);

  if (!clan || !user || clan.owner_id !== user.id) {
    return (
      <main className={pageClass}>


        <div className="mx-auto w-full max-w-[760px] px-4 py-16 sm:px-8">
          <h1 className="text-[32px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
            Settings unavailable.
          </h1>

          <p className="mt-2 text-[15px] text-[#6e6e73]">
            Only the clan owner can access these settings.
          </p>

          <Link
            href={`/clan/${slug}`}
            className="mt-6 inline-block text-[14px] text-[#0066cc] hover:underline"
          >
            ← Back to clan
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={pageClass}>

      <div className="mx-auto w-full max-w-[760px] px-4 py-8 sm:px-8 sm:py-12">
        <Link
          href={`/clan/${slug}`}
          className="text-[14px] text-[#0066cc] hover:underline"
        >
          ← Back to {clan.name}
        </Link>

        <h1 className="mt-4 text-[32px] font-semibold tracking-[-0.02em] text-[#1d1d1f] sm:text-[40px]">
          Settings.
        </h1>
        <p className="mt-1 text-[15px] text-[#6e6e73]">
          Manage how {clan.name} appears to members.
        </p>

        <div className="mt-6">
          <ClanSettings
            clanId={clan.id}
            initialName={clan.name}
            initialDescription={clan.description}
            initialVisibility={clan.visibility}
          />
        </div>
      </div>
    </main>
  );
}