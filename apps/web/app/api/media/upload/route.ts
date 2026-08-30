import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requirePermission } from "@/lib/auth";

const ALLOWED = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 3 * 1024 * 1024; // 3MB after client resize
const FOLDERS = ["items", "categories", "org", "misc"];

export async function POST(req: NextRequest) {
  try {
    // Image uploads back office work: only managers may write media.
    const manager = await requirePermission("manageMenu");
    const dealManager = await requirePermission("manageDeals");
    const companyManager = await requirePermission("manageCompany");
    if (!manager && !dealManager && !companyManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file");
    const folder = String(form.get("folder") || "misc");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported type. Use PNG, JPEG or WebP." },
        { status: 415 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image too large (max 3MB)." },
        { status: 413 }
      );
    }
    if (!FOLDERS.includes(folder)) {
      return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
    }

    const ext = file.type.split("/")[1] || "bin";
    const key = `${folder}/${crypto.randomUUID()}.${ext}`;
    const buf = await file.arrayBuffer();

    const { env } = await getCloudflareContext({ async: true });
    await (env as any).MEDIA.put(key, buf, {
      httpMetadata: { contentType: file.type },
    });

    return NextResponse.json({ url: `/media/${key}` });
  } catch (err) {
    console.error("media upload failed", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
