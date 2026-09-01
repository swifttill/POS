import { AdminNavigation } from "./components/AdminNavigation";

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="adminAppShell"><AdminNavigation /><div className="adminAppContent">{children}</div></div>;
}
