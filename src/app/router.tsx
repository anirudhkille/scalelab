import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";

import { HubPage } from "@/features/challenges";
import { LearnPage } from "@/features/learn";
import { ProgressPage } from "@/features/progress";
import { DevEnginePage } from "@/features/simulation";
import { WorkspacePage } from "@/features/workspace";

import { AppShell } from "./layouts/app-shell";
import { NotFoundPage } from "./pages/not-found-page";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <HubPage /> },
      { path: "challenge/:id", element: <WorkspacePage /> },
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
