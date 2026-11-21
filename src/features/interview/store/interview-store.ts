import { toast } from "sonner";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { ChallengeId } from "@/features/challenges";
import { backupCorruptEntry, safeJSONStorage } from "@/shared/storage";

import {
  EMPTY_INTERVIEW_STATE,
  interviewStateSchema,
  type InterviewSession,
  type InterviewState,
} from "../schema";

export const INTERVIEW_STORAGE_KEY = "scalelab:v1:interview";

type InterviewActions = {
  readonly startSession: (challengeId: ChallengeId, durationSec: number, startedAt: number) => void;
  readonly setAnswer: (challengeId: ChallengeId, promptId: string, answer: string) => void;
  readonly revealNotes: (challengeId: ChallengeId, promptId: string) => void;
  readonly completeSession: (challengeId: ChallengeId, completedAt: number) => void;
  readonly resetSession: (challengeId: ChallengeId) => void;
};

export type InterviewStoreState = InterviewState & InterviewActions;

function updateSession(
  sessions: InterviewState["sessions"],
  challengeId: ChallengeId,
  update: (session: InterviewSession) => InterviewSession,
): InterviewState["sessions"] {
  const key = String(challengeId);
  const current = sessions[key];

  if (!current) {
    return sessions;
  }

  return { ...sessions, [key]: update(current) };
}

export const useInterviewStore = create<InterviewStoreState>()(
  persist(
    (set) => ({
      ...EMPTY_INTERVIEW_STATE,

      startSession: (challengeId, durationSec, startedAt) => {
        set((state) => {
          const key = String(challengeId);

          if (state.sessions[key]) {
            return state;
          }

          return {
            sessions: {
              ...state.sessions,
              [key]: {
                challengeId,
                startedAt,
                durationSec,
                answers: {},
                revealed: [],
              },
            },
          };
        });
      },

      setAnswer: (challengeId, promptId, answer) => {
        set((state) => ({
          sessions: updateSession(state.sessions, challengeId, (session) =>
            session.completedAt === undefined
              ? { ...session, answers: { ...session.answers, [promptId]: answer } }
              : session,
          ),
        }));
      },

      revealNotes: (challengeId, promptId) => {
        set((state) => ({
          sessions: updateSession(state.sessions, challengeId, (session) =>
            session.revealed.includes(promptId)
              ? session
              : { ...session, revealed: [...session.revealed, promptId] },
          ),
        }));
      },

      completeSession: (challengeId, completedAt) => {
        set((state) => ({
          sessions: updateSession(state.sessions, challengeId, (session) => ({
            ...session,
            completedAt: session.completedAt ?? completedAt,
          })),
        }));
      },

      resetSession: (challengeId) => {
        set((state) => {
          const key = String(challengeId);
          const sessions = Object.fromEntries(
            Object.entries(state.sessions).filter(([sessionKey]) => sessionKey !== key),
          );

          return { sessions };
        });
      },
    }),
    {
      name: INTERVIEW_STORAGE_KEY,
      version: 1,
      storage: safeJSONStorage<InterviewState>(),
      partialize: (state): InterviewState => ({ sessions: state.sessions }),

      merge: (persistedState, currentState) => {
        const parsed = interviewStateSchema.safeParse(persistedState);

        if (parsed.success) {
          return { ...currentState, ...parsed.data };
        }

        if (backupCorruptEntry(INTERVIEW_STORAGE_KEY)) {
          toast.error("Saved interview answers were corrupt", {
            description: "A backup was kept and ScaleLab started a fresh interview file.",
          });
        }

        return currentState;
      },

      migrate: (persistedState) => persistedState as InterviewState,
    },
  ),
);

export function selectInterviewSession(
  challengeId: ChallengeId,
): (state: InterviewStoreState) => InterviewSession | undefined {
  return (state) => state.sessions[String(challengeId)];
}
