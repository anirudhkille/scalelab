import { useEffect, useState } from "react";

import type { InterviewSession } from "./schema";

export type InterviewClock = {
  readonly remainingSec: number;
  readonly elapsedSec: number;
  readonly expired: boolean;
};

export function useInterviewClock(session: InterviewSession | undefined): InterviewClock {
  const [now, setNow] = useState(() => Date.now());
  const completed = session?.completedAt !== undefined;

  useEffect(() => {
    if (!session || completed) {
      return;
    }

    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(timer);
  }, [completed, session]);

  if (!session) {
    return { remainingSec: 0, elapsedSec: 0, expired: false };
  }

  const endAt = completed ? (session.completedAt ?? session.startedAt) : now;
  const elapsedSec = Math.max(0, Math.floor((endAt - session.startedAt) / 1000));
  const remainingSec = Math.max(0, session.durationSec - elapsedSec);

  return {
    remainingSec,
    elapsedSec,
    expired: remainingSec === 0,
  };
}

export function formatClock(totalSec: number): string {
  const minutes = Math.floor(totalSec / 60);
  const seconds = Math.max(0, totalSec % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
