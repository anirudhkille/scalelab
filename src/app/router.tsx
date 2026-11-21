import { lazy } from "react";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";

import { NotFoundPage } from "./pages/not-found-page";

import { AppShell } from "./layouts/app-shell";

const HubPage = lazy(() =>
  import("@/features/challenges").then((module) => ({ default: module.HubPage })),
);

const WorkspacePage = lazy(() =>
  import("@/features/workspace").then((module) => ({ default: module.WorkspacePage })),
);

const CustomChallengePage = lazy(() =>
  import("@/features/challenges").then((module) => ({ default: module.CustomChallengePage })),
);

const SandboxPage = lazy(() =>
  import("@/features/workspace").then((module) => ({ default: module.SandboxPage })),
);

const ProgressPage = lazy(() =>
  import("@/features/progress").then((module) => ({ default: module.ProgressPage })),
);

const LearnPage = lazy(() =>
  import("@/features/learn").then((module) => ({ default: module.LearnPage })),
);

const DevEnginePage = lazy(() =>
  import("@/features/simulation").then((module) => ({ default: module.DevEnginePage })),
);

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <HubPage /> },
      { path: "challenge/:id", element: <WorkspacePage /> },
      { path: "custom", element: <CustomChallengePage /> },
      { path: "sandbox", element: <SandboxPage /> },
      { path: "progress", element: <ProgressPage /> },
      { path: "learn", element: <LearnPage /> },
      { path: "dev/engine", element: <DevEnginePage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
