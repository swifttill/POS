import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { PosIcon } from "@/components/PosIcon";
import { getSession, clearSession } from "@/lib/auth";
import ChangePinButton from "@/components/ChangePinButton";
import ChangePasswordButton from "@/components/ChangePasswordButton";

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
  ["Orders","/pos","order",true],
  ["Reports","/admin/reports","chart",user.permissions.viewReports],
  ["Shifts","/admin/shifts","clock",user.permissions.closeShift],
  ["Users & roles","/admin/users","users",user.permissions.manageUsers],
  ["Company","/admin/company","settings",user.permissions.manageCompany],
  ["Settings","/admin/settings","settings",user.permissions.manageUsers],
 ] as const;
 return <div className="min-h-screen bg-background text-text flex">
   <aside className="hidden lg:flex w-[230px] shrink-0 bg-ink text-white flex-col sticky top-0 h-screen">
    <div className="h-[72px] px-5 flex items-center border-b border-white/10"><div className="rounded-lg bg-white px-2 py-1"><Logo size={32} variant="mark"/></div><div className="ml-3"><div className="font-bold">SwiftTill</div><div className="text-[10px] text-white/55 uppercase tracking-[.16em]">Back office</div></div></div>
    <nav className="p-3 space-y-1 flex-1">{items.filter(i=>i[3]).map(i=><Link key={i[1]} href={i[1]} className={`flex items-center gap-3 h-10 px-3 rounded-lg text-sm font-semibold text-white/72 hover:text-white hover:bg-white/8 ${i[1]==="/admin"?"bg-white/10 text-white":""}`}><PosIcon name={i[2]} size={17}/>{i[0]}</Link>)}</nav>
    <div className="p-3 border-t border-white/10"><Link href="/pos" className="flex items-center justify-center gap-2 h-10 rounded-lg bg-brand text-white text-sm font-bold hover:bg-brand-dark"><PosIcon name="arrow" size={16}/> Open POS</Link></div>
   </aside>
   <div className="min-w-0 flex-1 flex flex-col">
    <header className="h-[72px] shrink-0 bg-white border-b border-line flex items-center justify-between px-4 lg:px-7 sticky top-0 z-20"><div><div className="text-lg font-bold">{user.role==="ADMIN"?"Owner dashboard":"Manager dashboard"}</div><div className="text-xs text-muted mt-0.5">Manage your restaurant operations and billing</div></div><div className="flex items-center gap-2"><div className="hidden md:block text-right mr-2"><div className="text-sm font-semibold">{user.name}</div><div className="text-[11px] text-muted uppercase">{user.role}</div></div>{user.permissions.resetOwnPin?<ChangePinButton/>:null}{user.permissions.resetOwnPin?<ChangePasswordButton/>:null}<form action={logout}><button className="h-9 px-3 rounded-lg border border-line text-sm font-semibold hover:bg-surface-2">Logout</button></form></div></header>
    <div className="lg:hidden bg-ink text-white px-3 py-2 flex gap-2 overflow-x-auto">{items.filter(i=>i[3]).map(i=><Link key={i[1]} href={i[1]} className="shrink-0 px-3 py-2 rounded-lg text-xs font-semibold bg-white/10">{i[0]}</Link>)}</div>
    <main className="flex-1 p-4 md:p-6 lg:p-7 max-w-[1500px] w-full mx-auto">{children}</main>
   </div>
 </div>
}

export const runtime="nodejs";
