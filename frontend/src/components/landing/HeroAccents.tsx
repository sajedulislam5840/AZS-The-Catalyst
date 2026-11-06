"use client";

import { motion } from "framer-motion";

/** Physics accent: parabolic trajectory with velocity and gravity vectors. */
export function TrajectoryOverlay() {
  return (
    <div className="relative hidden h-[200px] w-[360px] lg:block" aria-hidden="true">
      <svg viewBox="0 0 360 200" className="absolute inset-0 h-full w-full overflow-visible">
        <motion.path
          d="M10 190 Q 180 -50 350 190"
          fill="none"
          stroke="#0284C7"
          strokeWidth="1.5"
          strokeDasharray="5 6"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
        />
        <line x1="10" y1="190" x2="350" y2="190" stroke="rgba(71,85,105,0.35)" />
        {/* v0 vector */}
        <line x1="10" y1="190" x2="52" y2="128" stroke="#075985" strokeWidth="2" />
        <text x="58" y="126" fill="#075985" fontSize="12" fontFamily="var(--font-geist-mono)">v₀</text>
        {/* gravity vector */}
        <line x1="180" y1="70" x2="180" y2="112" stroke="#CC310E" strokeWidth="2" />
        <text x="188" y="108" fill="#CC310E" fontSize="12" fontFamily="var(--font-geist-mono)">g</text>
      </svg>
      <span className="azs-projectile absolute left-0 top-0 h-3 w-3 rounded-full bg-[#CC310E] shadow-[0_0_14px_3px_rgba(204,49,14,0.45)]" />
    </div>
  );
}

/** Chemistry accent: flask with a waving liquid surface and rising bubbles. */
export function FlaskAccent() {
  return (
    <div className="relative hidden h-[190px] w-[150px] lg:block" aria-hidden="true">
      <svg viewBox="0 0 150 190" className="absolute inset-0 h-full w-full">
        <defs>
          <clipPath id="azs-flask-clip">
            <path d="M58 14 H92 V70 L136 160 Q142 180 120 180 H30 Q8 180 14 160 L58 70 Z" />
          </clipPath>
          <linearGradient id="azs-liquid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F2711C" />
            <stop offset="1" stopColor="#CC310E" stopOpacity="0.85" />
          </linearGradient>
        </defs>
        <g clipPath="url(#azs-flask-clip)">
          <rect width="150" height="190" fill="rgba(204,49,14,0.06)" />
          <g className="azs-wave">
            <path
              d="M-60 112 q15 -10 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 V190 H-60 Z"
              fill="url(#azs-liquid)"
              opacity="0.9"
            />
          </g>
        </g>
        <path
          d="M58 14 H92 V70 L136 160 Q142 180 120 180 H30 Q8 180 14 160 L58 70 Z"
          fill="none"
          stroke="#CC310E"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <line x1="52" y1="14" x2="98" y2="14" stroke="#CC310E" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {[44, 66, 88, 104].map((left, i) => (
        <span
          key={left}
          className="azs-bubble absolute bottom-10 h-2 w-2 rounded-full bg-[#F2711C]/70"
          style={{ left, animationDelay: `${-i * 0.85}s` }}
        />
      ))}
    </div>
  );
}
