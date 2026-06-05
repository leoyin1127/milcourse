"use client";

import { Microscope } from "@phosphor-icons/react";
import type { Phase } from "@/lib/types";
import { ThemeToggle } from "./ThemeToggle";
import { ProgressBar } from "./ProgressBar";

interface TopBarProps {
  phase: Phase;
  current: number;
  total: number;
  answeredCount: number;
}

export function TopBar({ phase, current, total }: TopBarProps) {
  const showProgress = phase === "quiz";

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-fg">
            <Microscope size={18} weight="bold" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight text-fg">Pathology MIL</p>
            <p className="text-[11px] text-fg-subtle">Self-test</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {showProgress && (
            <span className="hidden text-xs font-medium tabular-nums text-fg-muted sm:block">
              {current + 1} / {total}
            </span>
          )}
          <ThemeToggle />
        </div>
      </div>

      {showProgress && <ProgressBar current={current} total={total} />}
    </header>
  );
}
