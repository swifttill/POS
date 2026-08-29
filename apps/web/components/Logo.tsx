"use client";

import { LOGO_FULL, LOGO_MARK, BRAND_NAME } from "@/lib/brand";

export function Logo({
  size = 36,
  variant = "full",
  showText = false,
}: {
  size?: number;
  variant?: "full" | "mark";
  showText?: boolean;
}) {
  const src = variant === "mark" ? LOGO_MARK : LOGO_FULL;
  return (
    <div className="flex items-center gap-2.5 select-none">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={BRAND_NAME}
        width={size}
        height={size}
        className="object-contain"
        style={{ height: size, width: "auto" }}
      />
      {showText ? (
        <div className="leading-tight">
          <div className="text-lg font-bold tracking-tight" style={{ color: "var(--color-brand)" }}>
            {BRAND_NAME}
          </div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted">
            POS
          </div>
        </div>
      ) : null}
    </div>
  );
}
