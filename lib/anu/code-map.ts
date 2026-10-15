import "server-only";
import { posix } from "node:path";
export type CodeFile = {path:string;text:string};
export type CodeEdge = {from:string;to:string;kind:"import"|"api-request";specifier:string};
const stop=new Set(["the","this","project","help","understand","summary","give","what","does","work","explain","with","from","code","file","files","how"]);
export function questionTerms(message:string){
 const terms=[...new Set(message.toLowerCase().match(/[a-z0-9_/-]{3,}/g)||[])].filter(t=>!stop.has(t));
 if(/auth|login|sign.?in|session/i.test(message))terms.push("auth","login","session","supabase","middleware","callback");
 if(/api|endpoint|request|data.?flow/i.test(message))terms.push("route","api","server","actions");
 return [...new Set(terms)].slice(0,24);
}
export function seedScore(path:string,terms:string[]){
 const name=path.toLowerCase();const matched=terms.reduce((n,t)=>n+(name.includes(t)?20:0),0);
 return matched+(/^readme\.md$/i.test(name)?(terms.length?4:30):0)+(/(?:^|\/)(?:package\.json|tsconfig\.json|pyproject\.toml|Cargo\.toml|go\.mod)$/i.test(name)?(terms.length?3:25):0)+(/(?:^|\/)(?:page|layout|main|app|index|server)\.(?:tsx?|jsx?|py|go|rs)$/.test(name)?7:0);
}
export type Aliases=Array<{prefix:string;targets:string[]}>;
export function readAliases(text:string):Aliases {
 // Resolve only plain JSON configurations. Unsupported JSONC/extends remain explicitly unknown.
 try {const config=JSON.parse(text);const base=typeof config.compilerOptions?.baseUrl==="string"?config.compilerOptions.baseUrl:".";
  return Object.entries(config.compilerOptions?.paths||{}).flatMap(([key,value])=>{
   if(!Array.isArray(value)||!key.endsWith("*"))return [];
   return [{prefix:key.slice(0,-1),targets:value.filter((v):v is string=>typeof v==="string"&&v.endsWith("*")).map(v=>posix.join(base,v.slice(0,-1))+"/")}];
  });
 }catch{return [];}
}
function resolvePath(base:string,paths:Set<string>){
 const safe=posix.normalize(base).replace(/^\.\//,"");if(safe.startsWith("../")||safe.startsWith("/"))return null;
 return [safe,...[".ts",".tsx",".js",".jsx",".mjs",".py",".vue",".svelte"].map(ext=>safe+ext),...["ts","tsx","js","jsx","py"].map(ext=>`${safe}/index.${ext}`)].find(path=>paths.has(path))||null;
}
export function codeConnections(file:CodeFile,paths:Set<string>,aliases:Aliases){
 const edges:CodeEdge[]=[];const unresolved:string[]=[];const specs=new Set<string>();
 const pattern=/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)["']([^"'\n]+)["']/g;
 for(const match of file.text.matchAll(pattern))specs.add(match[1]);
 for(const spec of [...specs].slice(0,60)){
  let target:string|null=null;
  if(spec.startsWith("."))target=resolvePath(posix.join(posix.dirname(file.path),spec),paths);
  else for(const alias of aliases){if(spec.startsWith(alias.prefix)){for(const base of alias.targets){target=resolvePath(base+spec.slice(alias.prefix.length),paths);if(target)break;}break;}}
  if(target)edges.push({from:file.path,to:target,kind:"import",specifier:spec});
  else if(spec.startsWith(".")||aliases.some(a=>spec.startsWith(a.prefix)))unresolved.push(spec);
 }
 for(const match of file.text.matchAll(/\bfetch\s*\(\s*["'`]([^"'`\n]+)["'`]/g)){
  const route=match[1].split("?")[0];if(!route.startsWith("/api/")||route.includes("${"))continue;
  const roots=["app","src/app"];
  for(const root of roots){const target=resolvePath(`${root}${route}/route`,paths);if(target){edges.push({from:file.path,to:target,kind:"api-request",specifier:route});break;}}
 }
 return {edges,unresolved};
}
export function excerpt(file:CodeFile,terms:string[],budget=1600){
 const lines=file.text.split("\n");const hits=lines.map((line,index)=>({index,score:terms.reduce((n,t)=>n+(line.toLowerCase().includes(t)?1:0),0)})).filter(hit=>hit.score>0).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,3);
 const indices=new Set<number>();for(let i=0;i<Math.min(10,lines.length);i++)indices.add(i);
 for(const hit of hits)for(let i=Math.max(0,hit.index-4);i<=Math.min(lines.length-1,hit.index+9);i++)indices.add(i);
 if(!hits.length)for(let i=0;i<Math.min(45,lines.length);i++)indices.add(i);
 let content="";const included:number[]=[];
 for(const index of [...indices].sort((a,b)=>a-b)){const line=`${index+1}: ${lines[index]}\n`;if(content.length+line.length>budget)continue;content+=line;included.push(index+1);}
 return {content,lineNumbers:included,totalLines:lines.length,truncated:included.length<lines.length};
}
