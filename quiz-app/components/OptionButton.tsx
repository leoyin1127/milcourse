"use client";

import { CheckCircle, XCircle } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";

export type OptionState = "idle" | "correct" | "wrong" | "muted";

interface OptionButtonProps {
  letter: string;
  text: string;
  state: OptionState;
  disabled: boolean;
  onClick: () => void;
}

const CONTAINER: Record<OptionState, string> = {
  idle: "border-border bg-surface hover:border-accent/50 hover:bg-surface-2",
  correct: "border-success/60 bg-success/10",
  wrong: "border-error/60 bg-error/10",
  muted: "border-border bg-surface opacity-55",
};

const BADGE: Record<OptionState, string> = {
  idle: "border border-border text-fg-muted group-hover:border-accent group-hover:text-accent-text",
  correct: "border-transparent bg-success text-white",
  wrong: "border-transparent bg-error text-white",
  muted: "border border-border text-fg-subtle",
};

export function OptionButton({
  letter,
  text,
  state,
  disabled,
  onClick,
}: OptionButtonProps) {
  const reduce = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={reduce || disabled ? undefined : { scale: 0.985 }}
      className={`group flex w-full items-start gap-3.5 rounded-xl border px-4 py-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        CONTAINER[state]
      } ${disabled ? "cursor-default" : "cursor-pointer"}`}
    >
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold transition-colors ${BADGE[state]}`}
      >
        {letter}
      </span>
      <span className="flex-1 text-[15px] leading-relaxed text-fg">{text}</span>
      {state === "correct" && (
        <CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-success" />
      )}
      {state === "wrong" && (
        <XCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-error" />
      )}
    </motion.button>
  );
}
