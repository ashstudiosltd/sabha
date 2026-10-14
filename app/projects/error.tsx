"use client";
export default function ProjectsError({ reset }: { reset: () => void }) { return <section className="dv-surface dv-empty" role="alert"><h2>This project couldn’t load.</h2><p>Please try again in a moment.</p><button type="button" className="dv-button" onClick={reset}>Try again</button></section>; }
