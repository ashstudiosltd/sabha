"use client";
import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { useEffect, type ReactNode } from "react";
/** Retain the current DOM so a date change never drops keyboard focus or flashes blank. */
export function ProjectViewTransition({viewKey,children,maxWidth,label}:{viewKey:string;children:ReactNode;maxWidth:number;label:string}) {
 const reduced=useReducedMotion();
 const controls=useAnimationControls();
 useEffect(()=>{
  controls.stop();
  if(reduced) {controls.set({opacity:1,filter:"blur(0px)"});return;}
  void controls.start({opacity:[.65,1],filter:["blur(1px)","blur(0px)"],transition:{duration:.36,ease:[.22,1,.36,1]}});
  return ()=>controls.stop();
 },[viewKey,reduced,controls]);
 return <motion.div initial={false} animate={{maxWidth}} className="dv-project-view" transition={{duration:reduced?0:.3,ease:[.22,1,.36,1]}}>
  <motion.div className="dv-soft-reveal" initial={false} animate={controls}>
   <div className="dv-calendar-scroll" aria-label={label}>{children}</div>
  </motion.div>
 </motion.div>;
}
