import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
export default function Dashboard() {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    return (<div className="app-shell">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)}/>

      <main className="app-main">
        {/* Page header */}
        <header className="page-header">
          <div>
            <p className="page-header-eyebrow">Dashboard</p>
            <h1 className="page-header-title">Welcome back</h1>
          </div>
          <button className="btn btn-primary" onClick={() => navigate("/projects")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Project
          </button>
        </header>

        <div className="dashboard-content">
          {/* Stat cards */}
          <section className="stat-grid">
            <StatCard label="Hours Logged" value="0" unit="hrs" icon={<IconClock />} empty/>
            <StatCard label="Active Projects" value="0" icon={<IconFolder />} empty/>
            <StatCard label="Total Entries" value="0" icon={<IconEntry />} empty/>
            <StatCard label="This Week" value="0" unit="hrs" icon={<IconCalendar />} empty/>
          </section>

          <div className="dashboard-columns">
            {/* Recent Activity */}
            <section className="dash-card dash-activity">
              <div className="dash-card-header">
                <h2 className="dash-card-title">Recent Activity</h2>
              </div>
              <div className="empty-state">
                <div className="empty-icon">
                  <IconActivity />
                </div>
                <p className="empty-heading">No activity to show yet.</p>
                <p className="empty-body">
                  Your recent project entries and updates will appear here once you start logging work.
                </p>
              </div>
            </section>

            {/* Right column */}
            <div className="dashboard-right">
              {/* Get started */}
              <section className="dash-card dash-get-started">
                <div className="dash-card-header">
                  <h2 className="dash-card-title">Get Started</h2>
                </div>
                <div className="get-started-body">
                  <div className="get-started-icon">
                    <IconRocket />
                  </div>
                  <p className="get-started-heading">Start your journey.</p>
                  <p className="get-started-body-text">
                    You haven't started a project yet. Organise your work and track your growth by creating your first digital logbook entry.
                  </p>
                  <button className="btn btn-primary btn-full" onClick={() => navigate("/projects")}>
                    Create First Project
                  </button>
                </div>
              </section>

              {/* Quick stats */}
              <section className="dash-card">
                <div className="dash-card-header">
                  <h2 className="dash-card-title">Overview</h2>
                  <button className="dash-link" onClick={() => navigate("/stats")}>
                    View all stats
                  </button>
                </div>
                <div className="overview-list">
                  <OverviewRow label="Projects created" value="—"/>
                  <OverviewRow label="Projects archived" value="—"/>
                  <OverviewRow label="Entries logged" value="—"/>
                  <OverviewRow label="Average session" value="—"/>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .app-shell {
          display: flex;
          min-height: 100vh;
          background: #f8fafc;
        }

        .app-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          overflow-x: hidden;
        }

        /* Page header */
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 32px 40px 0;
          gap: 16px;
        }
        .page-header-eyebrow {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #94a3b8;
          margin: 0 0 4px;
        }
        .page-header-title {
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: 30px;
          font-weight: 400;
          color: #1a2340;
          margin: 0;
        }

        /* Buttons */
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 18px;
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: background 0.15s ease, box-shadow 0.15s ease;
          white-space: nowrap;
        }
        .btn-primary {
          background: #4f63d2;
          color: #ffffff;
        }
        .btn-primary:hover {
          background: #3d50bf;
          box-shadow: 0 2px 10px rgba(79,99,210,0.3);
        }
        .btn-primary:focus-visible {
          outline: 2px solid #4f63d2;
          outline-offset: 2px;
        }
        .btn-full {
          width: 100%;
          justify-content: center;
        }

        /* Dashboard content */
        .dashboard-content {
          padding: 28px 40px 40px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* Stat grid */
        .stat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .stat-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px 22px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .stat-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .stat-card-label {
          font-size: 13px;
          font-weight: 500;
          color: #64748b;
        }
        .stat-card-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
        }
        .stat-card-value {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }
        .stat-card-number {
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: 34px;
          font-weight: 400;
          color: #1a2340;
          line-height: 1;
        }
        .stat-card-unit {
          font-size: 13px;
          color: #94a3b8;
          font-weight: 500;
        }
        .stat-card-empty-note {
          font-size: 11px;
          color: #cbd5e1;
        }

        /* Dashboard columns */
        .dashboard-columns {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 20px;
          align-items: start;
        }

        /* Dash cards */
        .dash-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
        }
        .dash-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 22px 16px;
          border-bottom: 1px solid #f1f5f9;
        }
        .dash-card-title {
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #1a2340;
          margin: 0;
        }
        .dash-link {
          font-size: 12px;
          color: #4f63d2;
          background: none;
          border: none;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          font-weight: 500;
          padding: 0;
          text-decoration: none;
        }
        .dash-link:hover {
          color: #3d50bf;
          text-decoration: underline;
        }

        /* Activity */
        .dash-activity {
          min-height: 340px;
          display: flex;
          flex-direction: column;
        }

        /* Empty state */
        .empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 32px;
          text-align: center;
          gap: 10px;
        }
        .empty-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          margin-bottom: 4px;
        }
        .empty-heading {
          font-size: 14px;
          font-weight: 600;
          color: #1a2340;
          margin: 0;
        }
        .empty-body {
          font-size: 13px;
          color: #94a3b8;
          margin: 0;
          max-width: 300px;
          line-height: 1.6;
        }

        /* Right column */
        .dashboard-right {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Get started */
        .get-started-body {
          padding: 24px 22px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 10px;
        }
        .get-started-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: rgba(79,99,210,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4f63d2;
          margin-bottom: 4px;
        }
        .get-started-heading {
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: 18px;
          font-weight: 400;
          color: #1a2340;
          margin: 0;
        }
        .get-started-body-text {
          font-size: 13px;
          color: #64748b;
          line-height: 1.6;
          margin: 0 0 6px;
        }

        /* Overview */
        .overview-list {
          padding: 8px 0;
        }
        .overview-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 22px;
          border-bottom: 1px solid #f8fafc;
        }
        .overview-row:last-child {
          border-bottom: none;
        }
        .overview-row-label {
          font-size: 13px;
          color: #64748b;
        }
        .overview-row-value {
          font-size: 13px;
          font-weight: 600;
          color: #94a3b8;
        }

        /* Responsive */
        @media (max-width: 1100px) {
          .stat-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 900px) {
          .dashboard-columns {
            grid-template-columns: 1fr;
          }
          .page-header, .dashboard-content {
            padding-left: 24px;
            padding-right: 24px;
          }
        }
        @media (max-width: 600px) {
          .stat-grid {
            grid-template-columns: 1fr 1fr;
          }
          .page-header {
            padding-top: 24px;
          }
          .page-header-title {
            font-size: 24px;
          }
          .btn span, .btn svg + span {
            display: inline;
          }
        }
      `}</style>
    </div>);
}
function StatCard({ label, value, unit, icon, empty, }) {
    return (<div className="stat-card">
      <div className="stat-card-top">
        <span className="stat-card-label">{label}</span>
        <div className="stat-card-icon">{icon}</div>
      </div>
      <div className="stat-card-value">
        <span className="stat-card-number">{value}</span>
        {unit && <span className="stat-card-unit">{unit}</span>}
      </div>
      {empty && <span className="stat-card-empty-note">Nothing logged yet</span>}
    </div>);
}
function OverviewRow({ label, value }) {
    return (<div className="overview-row">
      <span className="overview-row-label">{label}</span>
      <span className="overview-row-value">{value}</span>
    </div>);
}
function IconClock() {
    return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>);
}
function IconFolder() {
    return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7a2 2 0 0 1 2-2h4l2 3h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7z"/>
    </svg>);
}
function IconEntry() {
    return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      <line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>
    </svg>);
}
function IconCalendar() {
    return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>);
}
function IconActivity() {
    return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>);
}
function IconRocket() {
    return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    </svg>);
}
