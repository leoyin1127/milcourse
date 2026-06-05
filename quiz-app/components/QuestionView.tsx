"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, CheckCircle, XCircle } from "@phosphor-icons/react";
import type { Question } from "@/lib/types";
import { OptionButton, type OptionState } from "./OptionButton";

const LETTERS = ["A", "B", "C", "D", "E"];
const EASE = [0.16, 1, 0.3, 1] as const;

interface QuestionViewProps {
  question: Question;
  index: number;
  total: number;
  selected: number | null;
  onSelect: (choice: number) => void;
  onNext: () => void;
  onPrev: () => void;
  isLast: boolean;
}

export function QuestionView({
  question,
  index,
  total,
  selected,
  onSelect,
  onNext,
  onPrev,
  isLast,
}: QuestionViewProps) {
  const reduce = useReducedMotion();
  const answered = selected !== null;
  const correct = answered && selected === question.answer;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!answered) {
        const n = Number.parseInt(e.key, 10);
        if (n >= 1 && n <= question.options.length) {
          e.preventDefault();
          onSelect(n - 1);
          return;
        }
      } else if (e.key === "Enter" || e.key === "ArrowRight") {
        e.preventDefault();
        onNext();
        return;
      }
      if (e.key === "ArrowLeft" && index > 0) {
        e.preventDefault();
        onPrev();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answered, question.options.length, index, onSelect, onNext, onPrev]);

  function stateFor(i: number): OptionState {
    if (!answered) return "idle";
    if (i === question.answer) return "correct";
    if (i === selected) return "wrong";
    return "muted";
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent-text">
          {question.category}
        </span>
        <span className="text-xs font-medium tabular-nums text-fg-subtle">
          Question {index + 1} of {total}
        </span>
      </div>

      <h2 className="text-balance text-xl font-semibold leading-snug text-fg sm:text-2xl">
        {question.question}
      </h2>

      {question.code && (
        <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface-2 px-4 py-3 font-mono text-[13px] leading-relaxed text-fg">
          <code>{question.code}</code>
        </pre>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {question.options.map((opt, i) => (
          <OptionButton
            key={i}
            letter={LETTERS[i]}
            text={opt}
            state={stateFor(i)}
            disabled={answered}
            onClick={() => onSelect(i)}
          />
        ))}
      </div>

      <AnimatePresence initial={false}>
        {answered && (
          <motion.div
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduce ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <div
              className={`mt-5 rounded-xl border px-4 py-4 ${
                correct ? "border-success/40 bg-success/10" : "border-error/40 bg-error/10"
              }`}
            >
              <div className="mb-1.5 flex items-center gap-2">
                {correct ? (
                  <CheckCircle size={18} weight="fill" className="text-success" />
                ) : (
                  <XCircle size={18} weight="fill" className="text-error" />
                )}
                <span
                  className={`text-sm font-semibold ${correct ? "text-success" : "text-error"}`}
                >
                  {correct ? "Correct" : "Not quite"}
                </span>
              </div>
              <p className="text-[14.5px] leading-relaxed text-fg-muted">
                {question.explanation}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-7 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onPrev}
          disabled={index === 0}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:pointer-events-none disabled:opacity-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ArrowLeft size={16} weight="bold" />
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!answered}
          className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition-[opacity,transform] hover:opacity-90 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          {isLast ? "See results" : "Next"}
          <ArrowRight size={16} weight="bold" />
        </button>
      </div>

      {!answered && (
        <p className="mt-4 text-center text-xs text-fg-subtle">
          Pick an answer, or press <kbd>1</kbd>–<kbd>{question.options.length}</kbd>
        </p>
      )}
    </div>
  );
}
