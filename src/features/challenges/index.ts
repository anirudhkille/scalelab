export { ChallengeCard } from "./components/challenge-card";
export { RequirementsSheet } from "./components/requirements-sheet";
export {
  CHALLENGE_DIFFICULTY_LABELS,
  difficultyLabel,
  type ChallengeDifficulty,
} from "./difficulty";
export { CHALLENGES, challengeFor, challengeOrFallback } from "./data/catalog";
export { runConfigFor } from "./data/run-configs";
export { referenceArchitectureFor, starterArchitectureFor } from "./data/starter-designs";
export { HubPage } from "./pages/hub-page";
export {
  asChallengeId,
  challengeDifficultySchema,
  challengeIdSchema,
  challengeRequirementsSchema,
  challengeSchema,
  failureEventSchema,
  loadStageSchema,
  type Challenge,
  type ChallengeId,
  type ChallengeRequirements,
  type ChallengeRunConfig,
  type FailureEvent,
  type LoadStage,
} from "./schema";
