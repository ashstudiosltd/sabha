import { Suspense } from "react";
import ProjectDraftForm from "@/components/workspace/project-draft-form";
import Loading from "../loading";
export const metadata = { title: "Project draft" };
export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ draft?: string }> }) {
  const { draft } = await searchParams;
  return <Suspense fallback={<Loading />}><ProjectDraftForm key={draft ?? "new"} /></Suspense>;
}
