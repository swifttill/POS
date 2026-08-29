import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSession } from "@/lib/auth";

const ALLOWED = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 3 * 1024 * 1024; // 3MB after client resize
const FOLDERS = ["items", "categories", "org", "misc"];

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    await env.MEDIA.put(key, buf, {
      httpMetadata: { contentType: file.type },
    });

    return NextResponse.json({ url: `/media/${key}` });
  } catch (err) {
    console.error("media upload failed", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
