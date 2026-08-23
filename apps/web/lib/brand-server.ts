import fs from "node:fs";
import path from "node:path";

// Server-only: returns the public path if the asset file actually exists,
// so the print view can show a dropped-in logo without a broken image.
export function publicAssetIfExists(p: string): string | null {
  try {
    const full = path.join(process.cwd(), "public", p);
    return fs.existsSync(full) ? p : null;
  } catch {
    return null;
  }
}
