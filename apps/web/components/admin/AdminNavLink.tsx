"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PosIcon } from "@/components/PosIcon";

export function AdminNavLink({href,label,icon,mobile=false}:{href:string;label:string;icon:string;mobile?:boolean}){
  const pathname=usePathname();
  const active=href==="/admin"?pathname==="/admin":pathname.startsWith(href);
  if(mobile){
    return <Link href={href} className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${active?"bg-white text-ink shadow-sm":"bg-white/8 text-white/75 hover:text-white hover:bg-white/12"}`}><PosIcon name={icon} size={15}/>{label}</Link>
  }
  return <Link href={href} className={`group relative flex items-center gap-3 h-11 px-3.5 rounded-xl text-sm font-semibold transition ${active?"bg-white text-ink shadow-[0_8px_24px_rgba(0,0,0,.14)]":"text-white/68 hover:text-white hover:bg-white/8"}`}>
    <span className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${active?"bg-brand-soft text-brand":"bg-white/7 text-white/65 group-hover:bg-white/10 group-hover:text-white"}`}><PosIcon name={icon} size={16}/></span>
    <span className="truncate">{label}</span>
    {active?<span className="absolute right-2.5 w-1.5 h-1.5 rounded-full bg-brand"/>:null}
  </Link>
}
