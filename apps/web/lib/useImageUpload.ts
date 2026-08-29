"use client";

import { useState } from "react";

const ALLOWED = ["image/png", "image/jpeg", "image/webp"];
const MAX_W = 1200;
const MAX_H = 1200;

function resize(file: File): Promise<File> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > MAX_W || height > MAX_H) {
        const scale = Math.min(MAX_W / width, MAX_H / height, 1);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => {
          if (blob)
            resolve(
              new File([blob], file.name.replace(/\.\w+$/, ".webp"), {
                type: "image/webp",
              })
            );
          else resolve(file);
        },
        "image/webp",
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

export function useImageUpload(folder: string) {
  const [busy, setBusy] = useState(false);
  async function upload(file: File): Promise<string | null> {
    if (!ALLOWED.includes(file.type)) {
      throw new Error("Unsupported image type");
    }
    setBusy(true);
    try {
      const r = await resize(file);
      const fd = new FormData();
      fd.append("file", r);
      fd.append("folder", folder);
      const res = await fetch("/api/media/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Upload failed");
      return d.url as string;
    } finally {
      setBusy(false);
    }
  }
  return { upload, busy };
}
