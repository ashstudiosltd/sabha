import { redirect } from "next/navigation";
export default async function ProjectsLegacyEntry({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const source = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(source)) { if (Array.isArray(value)) value.forEach((item) => query.append(key, item)); else if (value !== undefined) query.set(key, value); }
  redirect(`/projects${query.size ? `?${query}` : ""}`);
}
