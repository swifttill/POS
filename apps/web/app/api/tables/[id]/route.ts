import { NextResponse } from "next/server";
import { db, restaurantTables, eq } from "@swift-till/db";
import { requireManager } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const manager = await requireManager();
    if (!manager) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const body = (await request.json()) as {
      number?: number;
      name?: string | null;
      seats?: number;
      zone?: string | null;
      posX?: number;
      posY?: number;
    };
    const patch: Record<string, unknown> = {};
    if (body.number != null) patch.number = body.number;
    if (body.name !== undefined) patch.name = body.name;
    if (body.seats != null) patch.seats = body.seats;
    if (body.zone !== undefined) patch.zone = body.zone;
    if (body.posX != null) patch.posX = body.posX;
    if (body.posY != null) patch.posY = body.posY;
    if (!Object.keys(patch).length) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }
    await db
      .update(restaurantTables)
      .set(patch)
      .where(eq(restaurantTables.id, id));
    const [table] = await db
      .select()
      .from(restaurantTables)
      .where(eq(restaurantTables.id, id))
      .limit(1);
    return NextResponse.json({ table });
  } catch (err) {
    console.error("PUT /api/tables/[id] failed", err);
    return NextResponse.json({ error: "Failed to update table" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const manager = await requireManager();
    if (!manager) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    await db.delete(restaurantTables).where(eq(restaurantTables.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/tables/[id] failed", err);
    return NextResponse.json({ error: "Failed to delete table" }, { status: 500 });
  }
}

export const runtime = "nodejs";
