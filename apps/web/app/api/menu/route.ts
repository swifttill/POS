import { NextResponse } from "next/server";
import { getMenuPayload } from "@/lib/menu";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const menu = await getMenuPayload();
    return NextResponse.json(menu);
  } catch (err) {
    console.error("GET /api/menu failed", err);
    return NextResponse.json(
      { error: "Failed to load menu" },
      { status: 500 }
    );
  }
}
