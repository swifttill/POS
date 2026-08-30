import { NextResponse } from "next/server";
import { db, customers, eq, asc } from "@swift-till/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    
    let customerList = await db.query.customers.findMany({
      where: eq(customers.active, true),
      orderBy: asc(customers.name),
    });

    if (q) {
      customerList = customerList.filter((c) =>
        c.name.toLowerCase().includes(q.toLowerCase()) ||
        c.phone.toLowerCase().includes(q.toLowerCase())
      );
    }

    return NextResponse.json({
      customers: customerList.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
      })),
    });
  } catch (err) {
    console.error("GET /api/customers failed", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";