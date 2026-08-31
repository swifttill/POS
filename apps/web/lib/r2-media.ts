// R2-backed media cleanup.
//
// The SwiftTill menu UI uploads images to Cloudflare R2 via
// /api/media/upload (bucket binding `MEDIA`), producing URLs of the form
// `/media/{key}`. This module deletes those objects from active R2 storage.
//
// R2 bindings only exist inside the Cloudflare runtime. Every function here is
// best-effort: if the binding is unavailable (e.g. during local/UTC dev), it
// logs and returns false WITHOUT throwing, so media cleanup never breaks a
// database operation or the POS/billing/payment flows.

export function isR2MediaUrl(url?: string | null): url is string {
  return typeof url === "string" && url.startsWith("/media/");
}

// Extract the R2 object key from a "/media/items/<uuid>.webp" style URL.
// Returns null if the URL is not an R2 media path we recognize.
function keyFromMediaUrl(url: string): string | null {
  const m = url.match(/^\/media\/(.+)$/);
  return m?.[1] ?? null;
}

export async function deleteR2Media(url?: string | null): Promise<boolean> {
  if (!isR2MediaUrl(url)) return false;
  const key = keyFromMediaUrl(url);
  if (!key) return false;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    const media = (env as any).MEDIA as { delete: (k: string) => unknown } | undefined;
    if (!media || typeof media.delete !== "function") return false;
    await media.delete(key);
    return true;
  } catch (err) {
    console.error("deleteR2Media failed for", url, err);
    return false;
  }
}
