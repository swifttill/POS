import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { PosIcon } from "@/components/PosIcon";
import { getSession, clearSession } from "@/lib/auth";
import ChangePinButton from "@/components/ChangePinButton";
import ChangePasswordButton from "@/components/ChangePasswordButton";
import { AdminNavLink } from "@/components/admin/AdminNavLink";

export const dynamic = "force-dynamic";

async function logout(){"use server";await clearSession()}

export default async function AdminLayout({children}:{children:React.ReactNode}){
 const user=await getSession();
 if(!user)redirect("/login");
 if(user.role==="WAITER")redirect("/pos");
 const items=[
  ["Dashboard","/admin","grid",true],
  ["Menu","/admin/menu","menu",user.permissions.manageMenu],
  ["Deals","/admin/deals","order",user.permissions.manageDeals],
  ["Tables","/admin/tables","table",user.permissions.manageTables],
  ["Orders","/admin/orders","order",true],
  ["Reports","/admin/reports","chart",user.permissions.viewReports],
  ["Shifts","/admin/shifts","clock",user.permissions.closeShift],
  ["Users & roles","/admin/users","users",user.permissions.manageUsers],
  ["Company","/admin/company","settings",user.permissions.manageCompany],
  ["Settings","/admin/settings","settings",user.permissions.manageUsers],
 ] as const;
 const visible=items.filter(i=>i[3]);
 const initials=user.name.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase();
 return <div className="min-h-screen bg-background text-text flex">
   <aside className="hidden lg:flex w-[252px] shrink-0 admin-sidebar text-white flex-col sticky top-0 h-screen">
    <div className="h-[82px] px-5 flex items-center border-b border-white/8">
      <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-black/15"><Logo size={34} variant="mark"/></div>
      <div className="ml-3 min-w-0"><div className="font-extrabold text-[17px] tracking-tight">SwiftTill</div><div className="text-[10px] text-white/45 uppercase tracking-[.18em] mt-0.5">Restaurant OS</div></div>
    </div>
    <div className="px-4 pt-5 pb-2 text-[10px] uppercase tracking-[.18em] font-bold text-white/35">Workspace</div>
    <nav className="px-3 space-y-1 flex-1 overflow-y-auto pos-scroll">{visible.map(i=><AdminNavLink key={i[1]} href={i[1]} label={i[0]} icon={i[2]}/>)}</nav>
    <div className="p-3 border-t border-white/8">
      <Link href="/pos" className="flex items-center justify-center gap-2.5 h-11 rounded-xl bg-brand text-white text-sm font-extrabold hover:bg-brand-dark shadow-lg shadow-brand/15 transition"><PosIcon name="arrow" size={16}/> Open POS</Link>
      <div className="flex items-center gap-3 px-2 mt-3 py-2"><div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-xs font-extrabold">{initials}</div><div className="min-w-0"><div className="text-xs font-bold truncate">{user.name}</div><div className="text-[10px] text-white/45 uppercase tracking-wider">{user.role}</div></div></div>
    </div>
   </aside>
   <div className="min-w-0 flex-1 flex flex-col">
    <header className="h-[82px] shrink-0 bg-white/92 backdrop-blur border-b border-line/80 flex items-center justify-between px-4 md:px-6 lg:px-8 sticky top-0 z-30">
      <div className="min-w-0"><div className="text-[11px] uppercase tracking-[.16em] font-bold text-muted">Back office</div><div className="text-lg md:text-xl font-extrabold text-ink tracking-tight mt-0.5">{user.role==="ADMIN"?"Owner workspace":"Manager workspace"}</div></div>
      <div className="flex items-center gap-2"><div className="hidden md:flex items-center gap-3 mr-1 px-3 py-2 rounded-xl bg-surface-2 border border-line/70"><div className="w-8 h-8 rounded-lg bg-ink text-white flex items-center justify-center text-[11px] font-extrabold">{initials}</div><div className="text-left"><div className="text-xs font-bold leading-4">{user.name}</div><div className="text-[10px] text-muted uppercase tracking-wider">{user.role}</div></div></div>{user.permissions.resetOwnPin?<ChangePinButton/>:null}{user.permissions.resetOwnPin?<ChangePasswordButton/>:null}<form action={logout}><button className="h-10 px-3.5 rounded-xl border border-line text-sm font-bold hover:bg-surface-2 transition">Logout</button></form></div>
    </header>
    <div className="lg:hidden admin-sidebar text-white px-3 py-3 flex gap-2 overflow-x-auto border-b border-white/8">{visible.map(i=><AdminNavLink key={i[1]} href={i[1]} label={i[0]} icon={i[2]} mobile/>)}</div>
    <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1540px] w-full mx-auto">{children}</main>
   </div>
 </div>
}

export const runtime="nodejs";
