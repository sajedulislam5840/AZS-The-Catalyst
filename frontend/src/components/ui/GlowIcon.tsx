"use client";

import { useSyncExternalStore, type CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { getGlowTick, getServerGlowTick, glowColor, subscribeGlow } from "@/lib/glow";

/** Current glow colour; changes every 15 seconds, shared across the whole page. */
export function useGlowColor(offset = 0): string {
  const tick = useSyncExternalStore(subscribeGlow, getGlowTick, getServerGlowTick);
  return glowColor(tick, offset);
}

const BOX = { sm: "h-9 w-9 rounded-xl", md: "h-11 w-11 rounded-xl", lg: "h-14 w-14 rounded-2xl" } as const;
const ICON = { sm: "h-[18px] w-[18px]", md: "h-5 w-5", lg: "h-7 w-7" } as const;

interface GlowIconProps {
  icon: LucideIcon;
  /** Shift along the palette so neighbouring icons show different colours. */
  offset?: number;
  size?: keyof typeof BOX;
  /** Show the soft tinted tile behind the icon. */
  tile?: boolean;
  className?: string;
}

/** A softly glowing icon whose colour fades to the next palette colour every 15 seconds. */
export default function GlowIcon({ icon: Icon, offset = 0, size = "md", tile = true, className = "" }: GlowIconProps) {
  const color = useGlowColor(offset);
  return (
    <span
      className={`azs-glow relative inline-flex shrink-0 items-center justify-center ${BOX[size]} ${tile ? "azs-glow-tile" : ""} ${className}`}
      style={{ "--glow": color } as CSSProperties}
    >
      <span aria-hidden="true" className="azs-glow-halo absolute inset-1.5 rounded-full" />
      <Icon aria-hidden="true" className={`azs-glow-icon relative ${ICON[size]}`} />
    </span>
  );
}
