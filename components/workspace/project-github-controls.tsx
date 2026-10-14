"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { disconnectGitHub, refreshGitHub, memberCommits } from "@/app/projects/github-actions";
export default function GitHubControls({slug,owner,connected,member}:{slug:string;owner:boolean;connected:boolean;member:boolean}) {
 const router=useRouter();const [pending,start]=useTransition();const [message,setMessage]=useState("");const [confirm,setConfirm]=useState(false);
 const [commits,setCommits]=useState<{sha:string;title:string;date:string|null}[]|null>(null);
 function run(action:()=>Promise<{ok:boolean;error?:string}>) {start(async()=>{const result=await action();setMessage(result.ok?"Connection updated.":result.error??"Try again shortly.");if(result.ok){setConfirm(false);setCommits(null);router.refresh();}});}
 if(!connected)return null;
 return <div className="dv-github-controls"><div className="dv-project-actions">{owner&&<><button className="dv-text-button" disabled={pending} onClick={()=>run(()=>refreshGitHub(slug))}>Refresh activity</button><button className="dv-text-button" disabled={pending} onClick={()=>setConfirm(!confirm)}>Disconnect</button></>}{member&&<button className="dv-text-button" disabled={pending} onClick={()=>{if(commits){setCommits(null);return;}start(async()=>{const result=await memberCommits(slug);if(result.ok)setCommits(result.commits);else setMessage(result.error);});}}>{commits?"Hide commits":"Member commit details"}</button>}</div>
 {confirm&&<div className="dv-publication-confirm"><p>Disconnect this repository? Its activity will disappear from this project. Your GitHub repository stays intact.</p><button className="dv-button" disabled={pending} onClick={()=>run(()=>disconnectGitHub(slug))}>Disconnect repository</button><button className="dv-text-button" onClick={()=>setConfirm(false)}>Cancel</button></div>}
 {message&&<p className="dv-note" role="status">{message}</p>}{commits&&<ul className="dv-member-commits">{commits.map(c=><li key={c.sha}><code>{c.sha.slice(0,7)}</code><span>{c.title}</span>{c.date&&<time dateTime={c.date}>{c.date.slice(0,10)}</time>}</li>)}</ul>}
 </div>;
}
