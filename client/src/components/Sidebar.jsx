import { NavLink, useNavigate } from "react-router-dom";
const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: IconDashboard },
    { to: "/projects", label: "Projects", icon: IconProjects },
    { to: "/stats", label: "Stats", icon: IconStats },
    { to: "/settings", label: "Settings", icon: IconSettings },
];
export default function Sidebar({ collapsed, onToggle }) {
    const navigate = useNavigate();
    return (<aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-logo-mark">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#4f63d2"/>
            <rect x="8" y="9" width="16" height="2" rx="1" fill="white"/>
            <rect x="8" y="14" width="12" height="2" rx="1" fill="white" opacity="0.7"/>
            <rect x="8" y="19" width="10" height="2" rx="1" fill="white" opacity="0.45"/>
          </svg>
        </div>
        {!collapsed && <span className="sidebar-brand-name">Digital Logbook</span>}
      </div>

      {/* Toggle button */}
      <button className="sidebar-toggle" onClick={onToggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
        <IconChevron collapsed={collapsed}/>
      </button>

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.map(({ to, label, icon: Icon }) => (<NavLink key={to} to={to} className={({ isActive }) => `sidebar-nav-item ${isActive ? "sidebar-nav-item--active" : ""}`} title={collapsed ? label : undefined}>
            <span className="sidebar-nav-icon">
              <Icon />
            </span>
            {!collapsed && <span className="sidebar-nav-label">{label}</span>}
          </NavLink>))}
      </nav>

      {/* Profile */}
      <button className="sidebar-profile" onClick={() => navigate("/profile")} title={collapsed ? "Profile" : undefined} aria-label="Go to profile">
        <div className="sidebar-avatar">
          <IconUser />
        </div>
        {!collapsed && (<div className="sidebar-profile-text">
            <span className="sidebar-profile-name">My Profile</span>
            <span className="sidebar-profile-sub">View &amp; edit</span>
          </div>)}
      </button>

      <style>{`
        .sidebar {
          width: 240px;
          min-height: 100vh;
          background: #1a2340;
          display: flex;
          flex-direction: column;
          padding: 24px 0 20px;
          position: relative;
          flex-shrink: 0;
          transition: width 0.22s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .sidebar--collapsed {
          width: 68px;
        }

        /* Brand */
        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 18px 28px;
          overflow: hidden;
        }
        .sidebar-logo-mark {
          flex-shrink: 0;
          display: flex;
          align-items: center;
        }
        .sidebar-brand-name {
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: rgba(255,255,255,0.9);
          white-space: nowrap;
          letter-spacing: 0.01em;
        }

        /* Toggle */
        .sidebar-toggle {
          position: absolute;
          top: 28px;
          right: -12px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #2e3a5c;
          border: 1.5px solid rgba(255,255,255,0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: rgba(255,255,255,0.6);
          transition: background 0.15s ease, color 0.15s ease;
          z-index: 10;
          padding: 0;
        }
        .sidebar-toggle:hover {
          background: #3d4f7a;
          color: rgba(255,255,255,0.95);
        }
        .sidebar-toggle:focus-visible {
          outline: 2px solid #4f63d2;
          outline-offset: 2px;
        }

        /* Nav */
        .sidebar-nav {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 0 10px;
        }
        .sidebar-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 8px;
          text-decoration: none;
          color: rgba(255,255,255,0.55);
          font-size: 14px;
          font-weight: 500;
          transition: background 0.15s ease, color 0.15s ease;
          white-space: nowrap;
          overflow: hidden;
        }
        .sidebar-nav-item:hover {
          background: rgba(255,255,255,0.07);
          color: rgba(255,255,255,0.85);
        }
        .sidebar-nav-item--active {
          background: rgba(79, 99, 210, 0.25);
          color: #7b8fe8;
        }
        .sidebar-nav-item--active:hover {
          background: rgba(79, 99, 210, 0.32);
          color: #8f9fef;
        }
        .sidebar-nav-icon {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          width: 20px;
          height: 20px;
        }
        .sidebar-nav-label {
          font-family: 'Inter', sans-serif;
        }

        /* Profile */
        .sidebar-profile {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 8px 10px 0;
          padding: 10px 12px;
          border-radius: 8px;
          background: transparent;
          border: none;
          cursor: pointer;
          color: rgba(255,255,255,0.6);
          text-align: left;
          transition: background 0.15s ease, color 0.15s ease;
          overflow: hidden;
        }
        .sidebar-profile:hover {
          background: rgba(255,255,255,0.07);
          color: rgba(255,255,255,0.85);
        }
        .sidebar-profile:focus-visible {
          outline: 2px solid #4f63d2;
          outline-offset: 2px;
        }
        .sidebar-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(79, 99, 210, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #7b8fe8;
        }
        .sidebar-profile-text {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
        }
        .sidebar-profile-name {
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.8);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sidebar-profile-sub {
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          color: rgba(255,255,255,0.35);
          white-space: nowrap;
        }
      `}</style>
    </aside>);
}
function IconDashboard() {
    return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>);
}
function IconProjects() {
    return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7a2 2 0 0 1 2-2h4l2 3h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7z"/>
    </svg>);
}
function IconStats() {
    return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>);
}
function IconSettings() {
    return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>);
}
function IconUser() {
    return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>);
}
function IconChevron({ collapsed }) {
    return (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform 0.22s ease" }}>
      <polyline points="15 18 9 12 15 6"/>
    </svg>);
}
