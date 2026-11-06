"use client";

import { Atom, FlaskConical, Magnet, Orbit, TestTube2, Zap } from "lucide-react";
import GlowIcon from "@/components/ui/GlowIcon";

// Placed near the edges so they never sit under the headline on a phone.
const ITEMS = [
  { Icon: Atom, pos: "left-3 top-28 sm:left-8", phone: true },
  { Icon: FlaskConical, pos: "right-3 top-36 sm:right-8", phone: true },
  { Icon: Magnet, pos: "left-4 bottom-44 sm:left-14 sm:bottom-52", phone: true },
  { Icon: TestTube2, pos: "right-4 bottom-52 sm:right-14 sm:bottom-60", phone: true },
  { Icon: Orbit, pos: "left-[18%] top-24", phone: false },
  { Icon: Zap, pos: "right-[18%] bottom-32", phone: false },
] as const;

/** Decorative glowing icons for phones and tablets, where the 3D scene is not loaded. */
export default function FloatingGlowIcons() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {ITEMS.map(({ Icon, pos, phone }, i) => (
        <div key={i} className={`absolute ${pos} ${phone ? "" : "hidden sm:block"} azs-drift`} style={{ animationDelay: `${-i * 1.3}s` }}>
          <GlowIcon icon={Icon} offset={i} size="lg" />
        </div>
      ))}
    </div>
  );
}
