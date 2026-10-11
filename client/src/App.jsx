import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import Login from "./pages/LogIn/Login.jsx";
import Dashboard from "./pages/Dashboard/Dashboard";

import Projects from "./pages/Projects/Projects";
import ProjectDetails from "./pages/Projects/ProjectDetails";
import SearchEntries from "./pages/Search/SearchEntries";

import Profile from "./pages/Profile/Profile";
import Stats from "./pages/Stats/Stats";
import Settings from "./pages/Settings/Settings";

import HelpAssistant from "./components/HelpAssistant.jsx";

import { UserProvider } from "./context/UserContext.jsx";
import { lazy, Suspense, useEffect } from "react";
import {
  applyTheme,
  loadPreferences,
  PREFERENCES_EVENT,
} from "./utils/preferences";

const ProjectConstellation = lazy(() => import('./pages/Constellation/ProjectConstellation'));

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    function openOnboarding() {
      const onDashboard = location.pathname === "/dashboard";
      navigate("/dashboard", {
        replace: onDashboard,
        state: {
          ...(onDashboard ? location.state : {}),
          openOnboarding: true,
        },
      });
    }

    window.addEventListener("digitalLogbookOpenOnboarding", openOnboarding);
    return () => window.removeEventListener("digitalLogbookOpenOnboarding", openOnboarding);
  }, [location.pathname, location.state, navigate]);

  const showHelpAssistant = location.pathname !== "/login";

  return (
    <>
      <Routes>
        <Route path="/constellation" element={<Suspense fallback={<p role="status">Loading constellation…</p>}><ProjectConstellation /></Suspense>} />
        <Route
          path="/"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/projects"
          element={<Projects />}
        />

        <Route
          path="/projects/:id"
          element={<ProjectDetails />}
        />

        <Route
          path="/search"
          element={<SearchEntries />}
        />

        <Route
          path="/profile"
          element={<Profile />}
        />

        <Route
          path="/stats"
          element={<Stats />}
        />

        <Route
          path="/settings"
          element={<Settings />}
        />
      </Routes>

      {showHelpAssistant && <HelpAssistant />}
    </>
  );
}

export default function App() {
  useEffect(() => {
    applyTheme(loadPreferences().theme);

    function handlePreferencesChanged(event) {
      applyTheme(
        event.detail?.theme ||
          loadPreferences().theme,
      );
    }

    window.addEventListener(
      PREFERENCES_EVENT,
      handlePreferencesChanged,
    );

    return () =>
      window.removeEventListener(
        PREFERENCES_EVENT,
        handlePreferencesChanged,
      );
  }, []);

  return (
    <BrowserRouter>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </BrowserRouter>
  );
}
