"use client";

import { motion, useReducedMotion } from "motion/react";

interface ScoreRingProps {
  score: number;
  total: number;
}

export function ScoreRing({ score, total }: ScoreRingProps) {
  const reduce = useReducedMotion();
  const pct = total > 0 ? score / total : 0;
  const size = 140;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-border"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-accent"
          strokeDasharray={circumference}
          initial={reduce ? { strokeDashoffset: offset } : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={reduce ? { duration: 0 } : { duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums text-fg">
          {score}
          <span className="text-lg font-medium text-fg-subtle">/{total}</span>
        </span>
        <span className="text-xs font-medium text-accent-text">
          {Math.round(pct * 100)}%
        </span>
      </div>
    </div>
  );
}
