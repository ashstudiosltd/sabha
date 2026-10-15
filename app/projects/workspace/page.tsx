import CatalogPage from "@/components/workspace/catalog-page";
export const dynamic="force-dynamic";
export const metadata={title:"Your workspace"};
export default async function WorkspacePage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){return <CatalogPage raw={await searchParams} mine/>;}
