import { redirect } from "next/navigation";

import ClanCreateForm from "@/components/feed/clan-create-form";
import SabhaNavbar from "@/components/sabha/sabha-navbar";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewClanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=%2Ffeed%2Fclans%2Fnew");

  return (
    <main className="sabha-design min-h-screen">
      <SabhaNavbar section="feed" />
      <ClanCreateForm />
    </main>
  );
}
