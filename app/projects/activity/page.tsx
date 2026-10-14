import Link from "next/link";
import { Activity, Folder } from "lucide-react";
export const metadata = { title: "Activity" };
export default function ProjectActivityPage() { return <><header className="dv-page-intro"><div><p className="dv-eyebrow">Your building journey</p><h1>Every step matters.</h1><p>A space for the progress, conversations, and milestones behind your projects.</p></div></header><section className="dv-surface dv-empty"><span className="dv-empty-icon"><Activity size={25} /></span><h2>Your project story starts here.</h2><p>Your project milestones and progress will appear here as your work takes shape.</p><Link href="/projects?view=mine" className="dv-button"><Folder size={14} />Your workspace</Link></section></>; }
