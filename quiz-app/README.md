# Pathology MIL — Quiz Website

An interactive, multiple-choice self-test for the **Introduction to Pathology MIL**
course. Twenty questions across the course sections, with an explanation after every
answer and a reviewable results screen.

Built with **Next.js (App Router)**, **Tailwind CSS v4**, **Motion**, and
**Geist** fonts. Dark/light theme with a toggle (honors your OS preference),
keyboard navigation, and reduced-motion support.

## Run it

```bash
cd milcourse/quiz-app
npm install
npm run dev        # http://localhost:3000
```

Production build:

```bash
npm run build
npm run start
```

## Editing the questions

All quiz content lives in [`app/quiz-data.ts`](app/quiz-data.ts) as a typed array.
Each entry has a `question`, four `options`, the `answer` index, and an
`explanation` (sourced from the course answer key). Add or edit entries there —
no other code changes needed.

## Structure

```
quiz-app/
├── app/
│   ├── layout.tsx        ← fonts, metadata, no-flash theme init
│   ├── page.tsx          ← renders the quiz
│   ├── globals.css       ← Tailwind v4 + design tokens (one amber accent)
│   └── quiz-data.ts      ← the 20 questions
├── components/
│   ├── QuizApp.tsx       ← state machine: start → quiz → results
│   ├── TopBar.tsx        ← sticky header + progress bar + theme toggle
│   ├── StartScreen.tsx
│   ├── QuestionView.tsx  ← prompt, options, feedback, keyboard nav
│   ├── OptionButton.tsx
│   ├── ResultsScreen.tsx ← score ring + per-question review
│   ├── ScoreRing.tsx
│   ├── ProgressBar.tsx
│   └── ThemeToggle.tsx
└── lib/types.ts
```

Keyboard: `1`–`4` to answer, `Enter` / `→` for next, `←` to go back.
