import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./pages/Login/Login.jsx";
import Dashboard from "./pages/Dashboard/Dashboard";

import Projects from "./pages/Projects/Projects";
import ProjectDetails from "./pages/Projects/ProjectDetails";

import Profile from "./pages/Profile/Profile";
import Stats from "./pages/Stats/Stats";
import Settings from "./pages/Settings/Settings";

import { UserProvider } from "./context/UserContext.jsx";
import { useEffect } from "react";
import { applyTheme, loadPreferences, PREFERENCES_EVENT } from "./utils/preferences";

export default function App() {
  useEffect(() => {
    applyTheme(loadPreferences().theme);

    function handlePreferencesChanged(event) {
      applyTheme(event.detail?.theme || loadPreferences().theme);
    }

    window.addEventListener(PREFERENCES_EVENT, handlePreferencesChanged);
    return () => window.removeEventListener(PREFERENCES_EVENT, handlePreferencesChanged);
  }, []);

  return (
    <BrowserRouter>
      <UserProvider>
        <Routes>
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
      </UserProvider>
    </BrowserRouter>
  );
}
