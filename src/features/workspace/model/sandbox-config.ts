export const SANDBOX_DESIGNS = [
  { id: "personal-blog", label: "Personal blog" },
  { id: "url-shortener", label: "URL shortener" },
  { id: "photo-feed", label: "Photo feed" },
  { id: "chat-notifications", label: "Chat / notifications" },
  { id: "flash-sale", label: "Flash sale" },
] as const;

export type SandboxSettings = {
  readonly targetUsers: number;
  readonly requestsPerUserPerSec: number;
  readonly readRatio: number;
  readonly staticRatio: number;
  readonly latencyP95Ms: number;
  readonly monthlyBudgetUsd: number;
};

export const DEFAULT_SANDBOX_SETTINGS: SandboxSettings = {
  targetUsers: 500,
  requestsPerUserPerSec: 2,
  readRatio: 0.8,
  staticRatio: 0.2,
  latencyP95Ms: 250,
  monthlyBudgetUsd: 1_000,
};
