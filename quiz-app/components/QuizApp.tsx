"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { questions } from "@/app/quiz-data";
import type { Phase } from "@/lib/types";
import { TopBar } from "./TopBar";
import { StartScreen } from "./StartScreen";
import { QuestionView } from "./QuestionView";
import { ResultsScreen } from "./ResultsScreen";

const EASE = [0.16, 1, 0.3, 1] as const;

export function QuizApp() {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("start");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    questions.map(() => null),
  );

  const start = useCallback(() => {
    setAnswers(questions.map(() => null));
    setCurrent(0);
    setPhase("quiz");
  }, []);

  // First answer per question wins; revisiting a question never overwrites it.
  const select = useCallback(
    (choice: number) => {
      setAnswers((prev) =>
        prev.map((a, i) => (i === current ? (a === null ? choice : a) : a)),
      );
    },
    [current],
  );

  const next = useCallback(() => {
    setCurrent((c) => {
      if (c + 1 >= questions.length) {
        setPhase("results");
        return c;
      }
      return c + 1;
    });
  }, []);

  const prev = useCallback(() => setCurrent((c) => Math.max(0, c - 1)), []);

  const restart = useCallback(() => {
    setAnswers(questions.map(() => null));
    setCurrent(0);
    setPhase("start");
  }, []);

  const reviewQuestion = useCallback((i: number) => {
    setCurrent(i);
    setPhase("quiz");
  }, []);

  const answeredCount = answers.filter((a) => a !== null).length;
  const score = answers.reduce<number>(
    (acc, a, i) => acc + (a === questions[i].answer ? 1 : 0),
    0,
  );

  const fade = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -10 },
        transition: { duration: 0.32, ease: EASE },
      };

  return (
    <div className="relative min-h-[100dvh]">
      {/* Ambient accent wash, restrained. Decorative only. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[420px] opacity-[0.06]"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 0%, var(--accent), transparent 70%)",
        }}
      />

      <TopBar
        phase={phase}
        current={current}
        total={questions.length}
        answeredCount={answeredCount}
      />

      <div className="mx-auto w-full max-w-3xl px-5 pb-28 pt-10 sm:px-6">
        <AnimatePresence mode="wait">
          {phase === "start" && (
            <motion.div key="start" {...fade}>
              <StartScreen total={questions.length} onStart={start} />
            </motion.div>
          )}

          {phase === "quiz" && (
            <motion.div key={`q-${current}`} {...fade}>
              <QuestionView
                question={questions[current]}
                index={current}
                total={questions.length}
                selected={answers[current]}
                onSelect={select}
                onNext={next}
                onPrev={prev}
                isLast={current + 1 === questions.length}
              />
            </motion.div>
          )}

          {phase === "results" && (
            <motion.div key="results" {...fade}>
              <ResultsScreen
                questions={questions}
                answers={answers}
                score={score}
                onRestart={restart}
                onReview={reviewQuestion}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
