import { Suspense } from "react";
import ProjectDraftForm from "@/components/workspace/project-draft-form";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Loading from "../loading";
export const metadata = { title: "Project draft" };
export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ draft?: string }> }) {
  const { draft } = await searchParams;
  const db=await createClient();const {data:{user}}=await db.auth.getUser();
  if(!user)redirect(`/auth?next=${encodeURIComponent(draft?`/projects/new?draft=${encodeURIComponent(draft)}`:"/projects/new")}`);
  return <Suspense fallback={<Loading />}><ProjectDraftForm key={draft ?? "new"} /></Suspense>;
}
