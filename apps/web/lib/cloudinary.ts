import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// Cloudinary is optional. When its env vars are absent we fall back to local
// files under public/assets, so deletion just removes the file from disk.

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function extractPublicId(url: string): string | null {
  try {
    const noQuery = url.split("?")[0];
    const m = noQuery.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

async function destroyCloudinary(publicId: string): Promise<void> {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto
    .createHash("sha1")
    .update(toSign)
    .digest("hex");

  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: apiKey,
    signature,
  });

  await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/destroy`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}

// Deletes an image wherever it lives: Cloudinary (by public_id) or a local
// public/asset file. Safe to call with null/empty.
export async function deleteImage(url?: string | null): Promise<void> {
  if (!url) return;
  try {
    if (isCloudinaryConfigured() && url.includes("res.cloudinary.com")) {
      const publicId = extractPublicId(url);
      if (publicId) await destroyCloudinary(publicId);
      return;
    }
    if (url.startsWith("/assets/uploads/")) {
      const file = path.join(process.cwd(), "public", url);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  } catch (err) {
    console.error("deleteImage failed for", url, err);
  }
}
