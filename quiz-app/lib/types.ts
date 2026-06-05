export interface Question {
  /** 1-based question number. */
  id: number;
  /** Course section this question belongs to. */
  category: string;
  /** The question prompt. */
  question: string;
  /** Optional monospace snippet (an equation or pipeline) shown under the prompt. */
  code?: string;
  /** Answer choices, in display order. */
  options: string[];
  /** Index into `options` of the correct choice. */
  answer: number;
  /** Shown after the user answers; sourced from the course answer key. */
  explanation: string;
}

export type Phase = "start" | "quiz" | "results";
