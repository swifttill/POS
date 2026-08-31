import { NextResponse } from "next/server";
import { buildReport } from "@/lib/reports";
import { authorize } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await authorize("viewReports");
    if (auth.status !== 200) return NextResponse.json({ error: auth.status === 401 ? "Unauthorized" : "Forbidden" }, { status: auth.status });
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const tender = url.searchParams.get("tender");
    const categoryId = url.searchParams.get("categoryId");
    const shiftId = url.searchParams.get("shiftId");

    const report = await buildReport({
      from: from ? new Date(from) : null,
      to: to ? new Date(to) : null,
      tender: tender || null,
      categoryId: categoryId || null,
      shiftId: shiftId || null,
    });

    return NextResponse.json(report);
  } catch (err) {
    console.error("GET /api/reports failed", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
