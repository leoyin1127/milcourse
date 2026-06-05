"use client";

import {
  ArrowRight,
  Brain,
  Cube,
  Database,
  ChartBar,
  Path,
  Stack,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";

interface StartScreenProps {
  total: number;
  onStart: () => void;
}

const TOPICS = [
  { icon: Brain, label: "MIL formulation" },
  { icon: Database, label: "Data preparation" },
  { icon: Cube, label: "Foundation encoders" },
  { icon: Stack, label: "Architectures" },
  { icon: Path, label: "Training & losses" },
  { icon: ChartBar, label: "Evaluation" },
];

export function StartScreen({ total, onStart }: StartScreenProps) {
  const reduce = useReducedMotion();

  return (
    <div className="flex flex-col items-center pt-6 text-center sm:pt-12">
      <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-fg-muted">
        {total} questions · multiple choice · ~15 min
      </span>

      <h1 className="mt-6 max-w-2xl text-balance text-3xl font-bold tracking-tight text-fg sm:text-5xl">
        Test your grasp of Pathology MIL
      </h1>

      <p className="mt-4 max-w-md text-pretty text-[15px] leading-relaxed text-fg-muted sm:text-base">
        Multiple instance learning for whole-slide pathology, from the MIL
        assumption to attention heatmaps. An explanation follows every answer.
      </p>

      <ul className="mt-9 grid w-full max-w-lg grid-cols-2 gap-2.5 text-left">
        {TOPICS.map(({ icon: Icon, label }, i) => (
          <motion.li
            key={label}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-3"
          >
            <Icon size={18} weight="bold" className="shrink-0 text-accent-text" />
            <span className="text-sm font-medium text-fg">{label}</span>
          </motion.li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onStart}
        className="mt-10 flex items-center gap-2 rounded-xl bg-accent px-7 py-3.5 text-sm font-semibold text-accent-fg transition-[opacity,transform] hover:opacity-90 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        Start the quiz
        <ArrowRight size={17} weight="bold" />
      </button>

      <p className="mt-6 text-xs text-fg-subtle">
        Based on the Introduction to Pathology MIL course.
      </p>
    </div>
  );
}
