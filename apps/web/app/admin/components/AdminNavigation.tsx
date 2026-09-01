"use client";

import { usePathname } from "next/navigation";

const links = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/access", label: "Access" },
  { href: "/admin/shifts", label: "Shifts" },
  { href: "/admin/printers", label: "Printers" },
];

export function AdminNavigation() {
  const pathname = usePathname();
  return <aside className="adminAppNav" aria-label="SwiftTill back office navigation">
    <div className="adminAppBrand"><span className="brandMark" aria-hidden="true">S</span><span><strong>SwiftTill</strong><small>Back Office</small></span></div>
    <nav>{links.map(link => {
      const active = pathname === link.href || (link.href !== "/admin/dashboard" && pathname.startsWith(link.href + "/"));
      return <a key={link.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined} href={link.href}>{link.label}</a>;
    })}</nav>
    <div className="adminAppNavFoot"><a href="/pos">← Return to POS</a><span>Operational access is permission-controlled server-side.</span></div>
  </aside>;
}
