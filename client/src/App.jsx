import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import Projects from "./pages/Projects/Projects";
import ProjectDetails from "./pages/ProjectDetails/ProjectDetails";
import Profile from "./pages/Profile/Profile";
import Stats from "./pages/Stats/Stats";
import Settings from "./pages/Settings/Settings";
export default function App() {
    return (<BrowserRouter basename="/digital_logbook">
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace/>}/>
        <Route path="/login" element={<Login />}/>
        <Route path="/dashboard" element={<Dashboard />}/>
        <Route path="/projects" element={<Projects />}/>
        <Route path="/projects/:id" element={<ProjectDetails />}/>
        <Route path="/profile" element={<Profile />}/>
        <Route path="/stats" element={<Stats />}/>
        <Route path="/settings" element={<Settings />}/>
      </Routes>
    </BrowserRouter>);
}
