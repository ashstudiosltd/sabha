"use client";
import { useLayoutEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { memberCommits } from "@/app/projects/github-actions";
import { ProjectViewTransition } from "./project-motion";
import type { ActivityDay } from "@/lib/github/sync";
const DAY = 86400000;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function stamp(value: number) { return new Date(value).toISOString().slice(0,10); }
function readable(date: string) { const d=new Date(`${date}T00:00:00Z`);return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`; }
export default function RepositoryActivityGraph({slug,days,interactive,today}:{slug:string;days:ActivityDay[];interactive:boolean;today:string}) {
 const [period,setPeriod]=useState("365");const [focus,setFocus]=useState<string|null>(null);
 const [tip,setTip]=useState<{date:string;count:number|null;x:number;y:number}|null>(null);
 const [selectedDay,setSelectedDay]=useState<string|null>(null);
 const [activity,setActivity]=useState<{sha:string;title:string;date:string|null;author:string;url:string}[]>([]);
 const [activityLoading,setActivityLoading]=useState(false);const [activityError,setActivityError]=useState("");
 const [activityPage,setActivityPage]=useState(1);const [hasMore,setHasMore]=useState(false);
 const requestId=useRef(0);
 async function openDay(date:string,pageNumber=1){
  if(!interactive)return;const id=++requestId.current;
  setSelectedDay(date);setActivityLoading(true);setActivityError("");if(pageNumber===1){setActivity([]);setHasMore(false);}
  try {const result=await memberCommits(slug,date,pageNumber);if(id!==requestId.current)return;
   if(result.ok){setActivity(old=>pageNumber===1?result.commits:[...old,...result.commits.filter(c=>!old.some(o=>o.sha===c.sha))]);setActivityPage(pageNumber);setHasMore(result.hasMore);}
   else {setActivityError(result.error);setHasMore(false);}
  }catch{if(id===requestId.current)setActivityError("Activity couldn’t load. Please try again.");}
  finally{if(id===requestId.current)setActivityLoading(false);}
 }
 const root=useRef<HTMLDivElement>(null);const tooltipId=useId();
 const [compact,setCompact]=useState(false);
 const [page,setPage]=useState(0);
 useLayoutEffect(()=>{
  const element=root.current;if(!element)return;
  let lastWidth=element.getBoundingClientRect().width;
  setCompact(lastWidth<560);
  const observer=new ResizeObserver(([entry])=>{
   const width=entry.contentRect.width;
   if(Math.abs(width-lastWidth)<1)return;
   lastWidth=width;setCompact(width<560);setTip(null);
  });
  const dismiss=()=>setTip(null);
  observer.observe(element);window.addEventListener("scroll",dismiss,true);
  return()=>{requestId.current++;observer.disconnect();window.removeEventListener("scroll",dismiss,true);};
 },[]);
 const sorted=[...days].sort((a,b)=>a.date.localeCompare(b.date));
 const end=Date.parse(`${today}T00:00:00Z`);
 const years=[...new Set(sorted.filter(d=>d.date<=today).map(d=>d.date.slice(0,4)))].reverse();
 let start=end-(Number(period)||365)*DAY+DAY;let finish=end;
 if(period.startsWith("year:")) {const year=period.slice(5);start=Math.max(Date.parse(`${year}-01-01T00:00:00Z`),Date.parse(`${sorted[0]?.date??today}T00:00:00Z`));finish=Math.min(end,Date.parse(`${year}-12-31T00:00:00Z`));}
 const selectedStart=start;const selectedFinish=finish;
 if(compact) {
  const lastSunday=selectedFinish-new Date(selectedFinish).getUTCDay()*DAY;
  const maxPage=Math.max(0,Math.ceil((lastSunday-105*DAY-selectedStart)/(112*DAY)));
  const currentPage=Math.min(page,maxPage);
  const windowStart=lastSunday-(currentPage*16+15)*7*DAY;
  start=Math.max(selectedStart,windowStart);
  finish=Math.min(selectedFinish,windowStart+111*DAY);
 }
 const counts=new Map(sorted.map(d=>[d.date,d.count]));
 const visible: {date:string;count:number|null}[]=[];
 for(let d=start;d<=finish;d+=DAY)visible.push({date:stamp(d),count:counts.get(stamp(d))??null});
 const total=visible.reduce((sum,d)=>sum+(d.count??0),0);const maximum=Math.max(1,...sorted.map(d=>d.count));
 const offset=new Date(start).getUTCDay();const columns=Math.ceil((offset+visible.length)/7);
 const bandColumns=columns;
 const bands=Math.ceil(columns/bandColumns);
 const months:{column:number;label:string}[]=[];
 for(let c=0;c<columns;c++){const d=new Date(Math.max(start,start+(c*7-offset)*DAY));const prior=months.at(-1);const label=`${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;if(!prior||prior.label!==label||c%bandColumns===0)months.push({column:c,label});}
 const active=visible.some(d=>d.date===focus)?focus:visible.at(-1)?.date;
 function show(element:HTMLButtonElement,date:string,count:number|null) {const cell=element.getBoundingClientRect();const box=root.current?.getBoundingClientRect();if(box)setTip({date,count,x:Math.min(Math.max(cell.left-box.left+cell.width/2,110),Math.max(110,box.width-110)),y:cell.top-box.top-8});}
 return <div className="dv-repository-graph" ref={root} onKeyDown={e=>{if(e.key==="Escape")setTip(null);}}>
  <div className="dv-graph-toolbar"><p className="dv-note">{total.toLocaleString("en-US")} commits · {readable(stamp(start))} – {readable(stamp(finish))}</p>{interactive&&<label className="dv-period-label">Period<select className="dv-input dv-period-select" value={period} onChange={e=>{setPeriod(e.target.value);setPage(0);setTip(null);setFocus(null);}}><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="180">Last 180 days</option><option value="365">Last year</option>{years.map(y=><option key={y} value={`year:${y}`}>{y} · available history</option>)}</select></label>}</div>
  <ProjectViewTransition viewKey={`${start}:${finish}:${compact}`} maxWidth={columns*24+80} label="Repository activity calendar">
   <div className="dv-calendar" style={{gridTemplateColumns:`24px repeat(${bandColumns}, minmax(0, 1fr))`}} role={interactive?"group":"img"} aria-label={`${total} commits from ${stamp(start)} to ${stamp(finish)}`}>
    {months.map((m,i)=><span key={`${m.column}-${m.label}`} className="dv-calendar-month" style={{gridColumn:`${m.column%bandColumns+2} / span ${Math.max(1,Math.min((months[i+1]?.column??columns)-m.column,bandColumns-m.column%bandColumns))}`,gridRow:Math.floor(m.column/bandColumns)*9+1}}>{m.label.slice(0,3)}</span>)}
    {Array.from({length:bands},(_,band)=>["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d,i)=><span key={`${band}-${d}`} aria-hidden="true" className="dv-calendar-day" style={{gridColumn:1,gridRow:band*9+i+2}}>{i%2===1?d:""}</span>))}
    {visible.map((day,i)=>{const level=!day.count?0:Math.min(4,Math.ceil(day.count/maximum*4));const style={gridColumn:Math.floor((offset+i)/7)%bandColumns+2,gridRow:(offset+i)%7+2};return interactive?<button type="button" data-day={day.date} key={day.date} style={style} className="dv-activity-cell dv-calendar-cell" data-level={level} data-missing={day.count===null||undefined} tabIndex={active===day.date?0:-1} aria-label={`${day.count===null?"Activity not available":`${day.count} ${day.count===1?"commit":"commits"}`} on ${readable(day.date)}`} aria-describedby={tip?.date===day.date?tooltipId:undefined} onMouseEnter={e=>show(e.currentTarget,day.date,day.count)} onMouseLeave={()=>setTip(null)} onFocus={e=>{setFocus(day.date);show(e.currentTarget,day.date,day.count);}} onBlur={()=>setTip(null)} aria-pressed={selectedDay===day.date} onClick={()=>{setTip(null);void openDay(day.date);}} onKeyDown={e=>{const move=({ArrowRight:7,ArrowLeft:-7,ArrowDown:1,ArrowUp:-1} as Record<string,number>)[e.key];if(move){e.preventDefault();const next=visible[Math.max(0,Math.min(visible.length-1,i+move))];root.current?.querySelector<HTMLButtonElement>(`button[data-day="${next.date}"]`)?.focus();}}}/>:<span key={day.date} aria-hidden="true" style={style} className="dv-activity-cell dv-calendar-cell" data-level={level} data-missing={day.count===null||undefined}/>;})}
   </div>
  </ProjectViewTransition>
  {compact&&interactive&&selectedFinish-selectedStart>111*DAY&&<nav className="dv-calendar-pages" aria-label="Activity history"><button type="button" className="dv-history-button" disabled={start<=selectedStart} onClick={()=>{setPage(p=>p+1);setTip(null);setFocus(null);}}><ChevronLeft size={15}/>Earlier</button><button type="button" className="dv-history-button" disabled={page===0} onClick={()=>{setPage(p=>Math.max(0,p-1));setTip(null);setFocus(null);}}>Later<ChevronRight size={15}/></button></nav>}
  {interactive&&selectedDay&&<section className="dv-day-activity" aria-label="Selected day commit activity" aria-busy={activityLoading}>
   <header><h3>Activity on {readable(selectedDay)}</h3><button type="button" className="dv-history-button" onClick={()=>{requestId.current++;setSelectedDay(null);setActivity([]);setActivityLoading(false);}}>Close</button></header>
   {activityLoading&&<p className="dv-note dv-pending-fade" role="status">Loading commits…</p>}
   {activityError&&<div role="alert"><p className="dv-note">{activityError}</p><button type="button" className="dv-history-button" onClick={()=>void openDay(selectedDay,activity.length?activityPage+1:1)}>Try again</button></div>}
   {!activityLoading&&!activityError&&activity.length===0&&<p className="dv-note">No non-merge commits found for this day on the default branch.</p>}
   <ul className="dv-member-commits">{activity.map(c=><li key={c.sha}><code>{c.sha.slice(0,7)}</code><div><a href={c.url} target="_blank" rel="noopener noreferrer">{c.title}</a><small>{c.author}{c.date?` · ${c.date.slice(11,16)} UTC`:""}</small></div></li>)}</ul>
   <p className="dv-note">Default branch · UTC · merge commits excluded. Synced graph counts can differ from current repository history.</p>
   {hasMore&&!activityError&&<button className="dv-history-button" disabled={activityLoading} onClick={()=>void openDay(selectedDay,activityPage+1)}>Show more commits</button>}
  </section>}
  {interactive&&tip&&<div className="dv-calendar-tooltip" role="tooltip" id={tooltipId} style={{left:tip.x,top:tip.y}}>{tip.count===null?"Activity unavailable":`${tip.count} ${tip.count===1?"commit":"commits"}`} on {readable(tip.date)}</div>}
  <div className="dv-activity-caption"><span>Default branch · UTC · merge commits excluded</span><span className="dv-activity-legend">Less {[0,1,2,3,4].map(n=><i key={n} className="dv-activity-cell" data-level={n}/>)} More</span></div>
 </div>;
}
