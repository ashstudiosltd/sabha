"use server";
import { catalogFilters, readCatalog, type CatalogCursor, type CatalogFilters } from "@/lib/projects/catalog";
export async function moreCatalog(raw:CatalogFilters,cursor:CatalogCursor){try{if(raw.scope!=="public"&&raw.scope!=="mine")throw new Error("Choose a project collection.");const filters=catalogFilters({...raw},raw.scope);return {ok:true as const,...await readCatalog(filters,cursor)};}catch(cause){return {ok:false as const,error:cause instanceof Error?cause.message:"Projects couldn’t load."};}}
