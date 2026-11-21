import { beforeEach, describe, expect, it } from "vitest";

import { asChallengeId } from "@/features/challenges";
import { useInterviewStore } from "../store/interview-store";

const CHALLENGE = asChallengeId("personal-blog");

describe("interview store", () => {
  beforeEach(() => {
    useInterviewStore.setState({ sessions: {} });
  });

  it("starts once, saves answers, and reveals notes without duplicates", () => {
    const store = useInterviewStore.getState();

    store.startSession(CHALLENGE, 1_500, 1_000);
    store.startSession(CHALLENGE, 999, 2_000);
    store.setAnswer(CHALLENGE, "capacity", "200 QPS average");
    store.revealNotes(CHALLENGE, "capacity");
    store.revealNotes(CHALLENGE, "capacity");

    const session = useInterviewStore.getState().sessions[String(CHALLENGE)];

    expect(session?.durationSec).toBe(1_500);
    expect(session?.answers.capacity).toBe("200 QPS average");
    expect(session?.revealed).toEqual(["capacity"]);
  });

  it("locks answers after completion and supports a fresh attempt", () => {
    const store = useInterviewStore.getState();

    store.startSession(CHALLENGE, 1_500, 1_000);
    store.setAnswer(CHALLENGE, "capacity", "first");
    store.completeSession(CHALLENGE, 2_000);
    store.setAnswer(CHALLENGE, "capacity", "late");
    store.completeSession(CHALLENGE, 9_999);

    const completed = useInterviewStore.getState().sessions[String(CHALLENGE)];
    expect(completed?.answers.capacity).toBe("first");
    expect(completed?.completedAt).toBe(2_000);

    useInterviewStore.getState().resetSession(CHALLENGE);
    expect(useInterviewStore.getState().sessions[String(CHALLENGE)]).toBeUndefined();
  });
});
