export const PROJECT_ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type ProjectReference={kind:"project";id:string};
export type ProjectPreview={id:string;slug:string;name:string;tagline:string;technologies:string[];stage:string;visibility:"public"|"private";archived:boolean};
/** New references store permanent IDs; legacy slugs are resolved at read time. */
export function projectReferenceKey(value:string|null|undefined):string|null {
 if(!value)return null;
 try {
  const url=new URL(value,"https://sabha.devvrats.in");
  if(url.origin!=="https://sabha.devvrats.in"||url.username||url.password)return null;
  const match=url.pathname.match(/^\/(?:sabha\/)?projects\/([a-z0-9-]{2,100})\/?$/i);
  return match?.[1]||null;
 }catch{return null;}
}
export function projectReferenceUrl(reference:ProjectReference){return `/projects/${reference.id}`;}
