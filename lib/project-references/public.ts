import "server-only";
import {createClient} from "@supabase/supabase-js";
import {PROJECT_ID} from "./contract";
/** Public metadata must never inherit a signed-in viewer's access. */
export async function publicProject(key:string){
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const {data,error}=await db.from("projects").select("id,slug,name,tagline,technologies,stage").eq(PROJECT_ID.test(key)?"id":"slug",key).eq("visibility","public").eq("publication_status","published").is("archived_at",null).maybeSingle();
 return error?null:data;
}
