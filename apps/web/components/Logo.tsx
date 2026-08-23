"use client";

import { useState } from "react";
import { BRAND_NAME, LOGO_CANDIDATES } from "@/lib/brand";

function InlineMark({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      style={{ filter: "drop-shadow(0 0 8px rgba(34,211,238,0.55))" }}
    >
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2f6bff" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <g
        fill="none"
        stroke="url(#lg)"
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="100" cy="128" r="46" />
        <path d="M150 92 L196 92 L150 164 L196 164" />
      </g>
    </svg>
  );
}

export function Logo({ size = 34 }: { size?: number }) {
  const [idx, setIdx] = useState(0);
  const [failedAll, setFailedAll] = useState(false);

  const showImg = idx < LOGO_CANDIDATES.length && !failedAll;

  return (
    <div className="flex items-center gap-3 select-none">
      {showImg ? (
        <img
          src={LOGO_CANDIDATES[idx]}
          alt="logo"
          width={size}
          height={size}
          onError={() => {
            if (idx < LOGO_CANDIDATES.length - 1) setIdx(idx + 1);
            else setFailedAll(true);
          }}
          style={{ filter: "drop-shadow(0 0 8px rgba(34,211,238,0.55))" }}
        />
      ) : (
        <InlineMark size={size} />
      )}
      <div className="leading-tight">
        <div className="text-lg font-bold glow-text tracking-tight">
          {BRAND_NAME}
        </div>
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted">
          POS
        </div>
      </div>
    </div>
  );
}
