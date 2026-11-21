export { AttemptCompareDialog } from "./components/attempt-compare-dialog";
export { DesignComparison } from "./components/design-comparison";
export { ResultDialog } from "./components/result-dialog";
export {
  costBreakdownByComponent,
  designDiff,
  type CostBreakdown,
  type CostBreakdownLine,
  type DesignDiff,
  type KindDelta,
} from "./design-comparison";
export { StarRating } from "./components/star-rating";
export {
  EXPORT_FORMAT,
  EXPORT_VERSION,
  buildExport,
  downloadExport,
  exportFileName,
  parseExport,
  scaleLabExportSchema,
  serializeExport,
  type ImportResult,
  type ScaleLabExport,
} from "./data-transfer";
export { ProgressPage } from "./pages/progress-page";
export { attemptFromResult, createAttempt } from "./records";
export {
  EMPTY_PROGRESS_DATA,
  MAX_HINTS_PER_CHALLENGE,
  asAttemptId,
  attemptIdSchema,
  attemptRecordSchema,
  attemptsSchema,
  designMapSchema,
  hintsMapSchema,
  hintsUnlockedSchema,
  newAttemptId,
  progressDataSchema,
  type AttemptId,
  type AttemptRecord,
  type ProgressData,
} from "./schema";
export { scoreAttempt, type AttemptScore, type AttemptStars } from "./scoring";
export { summarizeProgress, streakDaysFromAttempts } from "./stats";
export type { ChallengeProgress, ProgressSummary } from "./stats";
export {
  MAX_ATTEMPTS_PER_CHALLENGE,
  PROGRESS_STORAGE_KEY,
  bestStarsForChallenge,
  selectAttemptCount,
  selectAttempts,
  selectAttemptsForChallenge,
  selectDesign,
  selectHintsUnlocked,
  selectProgressData,
  useAttemptStore,
  type ProgressActions,
  type ProgressState,
} from "./store/attempt-store";
