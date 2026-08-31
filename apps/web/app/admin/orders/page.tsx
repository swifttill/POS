import Link from "next/link";
import { OrdersTable } from "@/components/OrdersTable";
import { PosIcon } from "@/components/PosIcon";

export default function AdminOrdersPage(){
 return <div>
   <div className="page-heading"><div><div className="section-title mb-2.5">Sales desk</div><h1 className="page-title">Orders</h1><p className="page-subtitle">Search live and historical bills, review payment status, reprint receipts and reopen active orders.</p></div><Link href="/pos" className="btn-primary h-11 gap-2"><PosIcon name="plus" size={16}/> New order</Link></div>
   <OrdersTable/>
 </div>
}
