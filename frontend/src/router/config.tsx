import type { RouteObject } from "react-router-dom";
import NotFound from "../pages/NotFound";
import Home from "../pages/home/page";
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import AppLayout from "../components/feature/AppLayout";
import AnalyzePage from "../pages/analyze/page";
import ResultsPage from "../pages/results/page";
import HistoryPage from "../pages/history/page";
import ChatPage from "../pages/chat/page";
import AlertsPage from "../pages/alerts/page";
import SettingsPage from "../pages/settings/page";

const routes: RouteObject[] = [
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { path: "analyze", element: <AnalyzePage /> },
      { path: "results", element: <ResultsPage /> },
      { path: "history", element: <HistoryPage /> },
      { path: "chat", element: <ChatPage /> },
      { path: "alerts", element: <AlertsPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

export default routes;
