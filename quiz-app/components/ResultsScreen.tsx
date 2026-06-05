"use client";

import { useState } from "react";
import {
  ArrowClockwise,
  CaretDown,
  CheckCircle,
  XCircle,
} from "@phosphor-icons/react";
import type { Question } from "@/lib/types";
import { ScoreRing } from "./ScoreRing";

const LETTERS = ["A", "B", "C", "D", "E"];

interface ResultsScreenProps {
  questions: Question[];
  answers: (number | null)[];
  score: number;
  onRestart: () => void;
  onReview: (index: number) => void;
}

function tierMessage(pct: number): string {
  if (pct >= 0.9) return "Outstanding — you've got MIL down cold.";
  if (pct >= 0.75) return "Strong grasp of the fundamentals.";
  if (pct >= 0.5) return "Solid start — a few areas worth revisiting.";
  return "Worth another pass through the material.";
}

export function ResultsScreen({
  questions,
  answers,
  score,
  onRestart,
  onReview,
}: ResultsScreenProps) {
  const total = questions.length;
  const pct = total > 0 ? score / total : 0;
  const [onlyWrong, setOnlyWrong] = useState(false);
  const wrongCount = total - score;

  const rows = questions
    .map((q, i) => ({ q, i, correct: answers[i] === q.answer }))
    .filter((row) => (onlyWrong ? !row.correct : true));

  return (
    <div className="pt-2">
      <div className="flex flex-col items-center text-center">
        <ScoreRing score={score} total={total} />
        <h1 className="mt-6 text-balance text-2xl font-bold tracking-tight text-fg sm:text-3xl">
          {tierMessage(pct)}
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          {score} correct · {wrongCount} to review
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onRestart}
            className="flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-fg transition-[opacity,transform] hover:opacity-90 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            <ArrowClockwise size={17} weight="bold" />
            Retake the quiz
          </button>
          {wrongCount > 0 && (
            <button
              type="button"
              onClick={() => setOnlyWrong((v) => !v)}
              className="rounded-xl border border-border bg-surface px-5 py-3 text-sm font-medium text-fg transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {onlyWrong ? "Show all questions" : "Show only incorrect"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-12">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-fg-subtle">
          Review
        </h2>
        <ul className="flex flex-col gap-2.5">
          {rows.map(({ q, i, correct }) => (
            <ReviewRow
              key={q.id}
              question={q}
              index={i}
              correct={correct}
              chosen={answers[i]}
              onReview={() => onReview(i)}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

interface ReviewRowProps {
  question: Question;
  index: number;
  correct: boolean;
  chosen: number | null;
  onReview: () => void;
}

function ReviewRow({ question, index, correct, chosen, onReview }: ReviewRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <li className="overflow-hidden rounded-xl border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      >
        {correct ? (
          <CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-success" />
        ) : (
          <XCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-error" />
        )}
        <span className="flex-1">
          <span className="mr-2 text-xs font-semibold tabular-nums text-fg-subtle">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="text-sm font-medium text-fg">{question.question}</span>
        </span>
        <CaretDown
          size={16}
          weight="bold"
          className={`mt-1 shrink-0 text-fg-subtle transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-border px-4 py-4 text-sm">
          <p className="flex flex-wrap gap-x-2 gap-y-1">
            <span className="font-medium text-success">Correct:</span>
            <span className="text-fg-muted">
              {LETTERS[question.answer]}. {question.options[question.answer]}
            </span>
          </p>
          {!correct && (
            <p className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1">
              <span className="font-medium text-error">Your answer:</span>
              <span className="text-fg-muted">
                {chosen === null
                  ? "Skipped"
                  : `${LETTERS[chosen]}. ${question.options[chosen]}`}
              </span>
            </p>
          )}
          <p className="mt-3 leading-relaxed text-fg-muted">{question.explanation}</p>
          <button
            type="button"
            onClick={onReview}
            className="mt-3 text-xs font-semibold text-accent-text transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:underline"
          >
            Revisit this question →
          </button>
        </div>
      )}
    </li>
  );
}
