import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import { requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

const LOCAL_DIR = "assets/uploads";

export async function POST(request: Request) {
  try {
    const allowed = await requirePermission("manageMenu");
    if (!allowed) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());

    if (isCloudinaryConfigured()) {
      const cloud = process.env.CLOUDINARY_CLOUD_NAME!;
      const apiKey = process.env.CLOUDINARY_API_KEY!;
      const apiSecret = process.env.CLOUDINARY_API_SECRET!;
      const timestamp = Math.floor(Date.now() / 1000);
      const folder = "swifttill";
      const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
      const signature = crypto.createHash("sha1").update(toSign).digest("hex");

      const fd = new FormData();
      fd.append("file", new Blob([buffer], { type: file.type }), file.name);
      fd.append("api_key", apiKey);
      fd.append("timestamp", String(timestamp));
      fd.append("signature", signature);
      fd.append("folder", folder);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloud}/image/upload`,
        { method: "POST", body: fd }
      );
      const data = await res.json();
      if (!res.ok || !data.secure_url) {
        return Response.json(
          { error: data?.error?.message ?? "Upload failed" },
          { status: 502 }
        );
      }
      return Response.json({ url: data.secure_url, publicId: data.public_id });
    }

    // Local fallback: save under public/assets/uploads.
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : "jpg";
    const name = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${safeExt}`;
    const dir = path.join(process.cwd(), "public", LOCAL_DIR);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, name), buffer);
    return Response.json({ url: `/${LOCAL_DIR}/${name}` });
  } catch (err) {
    console.error("POST /api/admin/upload failed", err);
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
