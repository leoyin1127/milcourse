"use client";

import { motion, useReducedMotion } from "motion/react";

interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const reduce = useReducedMotion();
  const pct = Math.min(100, Math.round(((current + 1) / total) * 100));

  return (
    <div
      className="h-0.5 w-full bg-border/60"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={current + 1}
      aria-label="Quiz progress"
    >
      <motion.div
        className="h-full bg-accent"
        initial={false}
        animate={{ width: `${pct}%` }}
        transition={reduce ? { duration: 0 } : { duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}
