import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import CreateProjectModal from "../../components/CreateProjectModal";
export default function Projects() {
    const [collapsed, setCollapsed] = useState(false);
    const [tab, setTab] = useState("active");
    const [searchValue, setSearchValue] = useState("");
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showHoursFilter, setShowHoursFilter] = useState(false);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [hoursMin, setHoursMin] = useState("");
    const [hoursMax, setHoursMax] = useState("");
    const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
    const navigate = useNavigate();
    const hasDateFilter = dateFrom || dateTo;
    const hasHoursFilter = hoursMin || hoursMax;
    function clearDateFilter() {
        setDateFrom("");
        setDateTo("");
        setShowDatePicker(false);
    }
    function clearHoursFilter() {
        setHoursMin("");
        setHoursMax("");
        setShowHoursFilter(false);
    }
    return (<div className="app-shell">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)}/>

      <main className="app-main">
        {/* Page header */}
        <header className="page-header">
          <div>
            <p className="page-header-eyebrow">Projects</p>
            <h1 className="page-header-title">My Projects</h1>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreateProjectModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Project
          </button>
        </header>

        <div className="projects-content">
          {/* Toolbar */}
          <div className="projects-toolbar">
            {/* Search */}
            <div className="search-box">
              <span className="search-icon">
                <IconSearch />
              </span>
              <input className="search-input" type="text" placeholder="Search projects…" value={searchValue} onChange={(e) => setSearchValue(e.target.value)}/>
              {searchValue && (<button className="search-clear" onClick={() => setSearchValue("")} aria-label="Clear search">
                  <IconX size={14}/>
                </button>)}
            </div>

            <div className="toolbar-filters">
              {/* Date range filter */}
              <div className="filter-wrap">
                <button className={`btn-filter ${hasDateFilter ? "btn-filter--active" : ""}`} onClick={() => {
            setShowDatePicker((v) => !v);
            setShowHoursFilter(false);
        }}>
                  <IconCalendar />
                  <span>
                    {hasDateFilter
            ? `${dateFrom || "…"} → ${dateTo || "…"}`
            : "Date range"}
                  </span>
                  {hasDateFilter && (<span className="filter-clear-dot" onClick={(e) => { e.stopPropagation(); clearDateFilter(); }} role="button" aria-label="Clear date filter">
                      <IconX size={10}/>
                    </span>)}
                </button>
                {showDatePicker && (<div className="filter-dropdown">
                    <p className="filter-dropdown-label">Date range</p>
                    <div className="filter-date-row">
                      <div className="filter-field">
                        <label className="filter-field-label">From</label>
                        <input type="date" className="filter-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}/>
                      </div>
                      <div className="filter-field">
                        <label className="filter-field-label">To</label>
                        <input type="date" className="filter-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)}/>
                      </div>
                    </div>
                    <div className="filter-dropdown-actions">
                      <button className="btn-filter-action btn-filter-clear" onClick={clearDateFilter}>Clear</button>
                      <button className="btn-filter-action btn-filter-apply" onClick={() => setShowDatePicker(false)}>Apply</button>
                    </div>
                  </div>)}
              </div>

              {/* Hours filter */}
              <div className="filter-wrap">
                <button className={`btn-filter ${hasHoursFilter ? "btn-filter--active" : ""}`} onClick={() => {
            setShowHoursFilter((v) => !v);
            setShowDatePicker(false);
        }}>
                  <IconClock />
                  <span>
                    {hasHoursFilter
            ? `${hoursMin || "0"}h – ${hoursMax || "∞"}h`
            : "Hours"}
                  </span>
                  {hasHoursFilter && (<span className="filter-clear-dot" onClick={(e) => { e.stopPropagation(); clearHoursFilter(); }} role="button" aria-label="Clear hours filter">
                      <IconX size={10}/>
                    </span>)}
                </button>
                {showHoursFilter && (<div className="filter-dropdown">
                    <p className="filter-dropdown-label">Hours logged</p>
                    <div className="filter-date-row">
                      <div className="filter-field">
                        <label className="filter-field-label">Min (hrs)</label>
                        <input type="number" min="0" className="filter-input" placeholder="0" value={hoursMin} onChange={(e) => setHoursMin(e.target.value)}/>
                      </div>
                      <div className="filter-field">
                        <label className="filter-field-label">Max (hrs)</label>
                        <input type="number" min="0" className="filter-input" placeholder="Any" value={hoursMax} onChange={(e) => setHoursMax(e.target.value)}/>
                      </div>
                    </div>
                    <div className="filter-dropdown-actions">
                      <button className="btn-filter-action btn-filter-clear" onClick={clearHoursFilter}>Clear</button>
                      <button className="btn-filter-action btn-filter-apply" onClick={() => setShowHoursFilter(false)}>Apply</button>
                    </div>
                  </div>)}
              </div>
            </div>
          </div>

          {/* Tabs + count */}
          <div className="projects-tabs-row">
            <div className="projects-tabs">
              <button className={`projects-tab ${tab === "active" ? "projects-tab--active" : ""}`} onClick={() => setTab("active")}>
                Active
              </button>
              <button className={`projects-tab ${tab === "archived" ? "projects-tab--active" : ""}`} onClick={() => setTab("archived")}>
                Archived
              </button>
            </div>
            <span className="projects-count">0 projects</span>
          </div>

          {/* Project list */}
          <div className="projects-list">
            {tab === "active" ? (<ActiveEmptyState onNew={() => setShowCreateProjectModal(true)}/>) : (<ArchivedEmptyState />)}
          </div>
        </div>
      </main>

      {showCreateProjectModal && (
        <CreateProjectModal
          onClose={() => setShowCreateProjectModal(false)}
          onSave={() => setShowCreateProjectModal(false)}
        />
      )}

      {/* Close dropdowns on outside click */}
      {(showDatePicker || showHoursFilter) && (<div className="dropdown-backdrop" onClick={() => { setShowDatePicker(false); setShowHoursFilter(false); }}/>)}

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

        /* Projects content */
        .projects-content {
          padding: 28px 40px 40px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Toolbar */
        .projects-toolbar {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        /* Search */
        .search-box {
          position: relative;
          flex: 1;
          min-width: 200px;
          max-width: 400px;
        }
        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          display: flex;
          align-items: center;
          pointer-events: none;
        }
        .search-input {
          width: 100%;
          padding: 9px 36px 9px 38px;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          color: #1e293b;
          background: #ffffff;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .search-input::placeholder { color: #94a3b8; }
        .search-input:focus {
          border-color: #4f63d2;
          box-shadow: 0 0 0 3px rgba(79,99,210,0.1);
        }
        .search-clear {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          display: flex;
          align-items: center;
          padding: 2px;
          border-radius: 4px;
        }
        .search-clear:hover { color: #64748b; }

        /* Filters */
        .toolbar-filters {
          display: flex;
          gap: 8px;
        }
        .filter-wrap {
          position: relative;
        }
        .btn-filter {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 14px;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          background: #ffffff;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: #64748b;
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
          white-space: nowrap;
        }
        .btn-filter:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
          color: #1e293b;
        }
        .btn-filter--active {
          border-color: #4f63d2;
          background: rgba(79,99,210,0.06);
          color: #4f63d2;
        }
        .btn-filter--active:hover {
          background: rgba(79,99,210,0.1);
        }
        .filter-clear-dot {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: rgba(79,99,210,0.15);
          color: #4f63d2;
          cursor: pointer;
          margin-left: 2px;
        }
        .filter-clear-dot:hover {
          background: rgba(79,99,210,0.25);
        }

        /* Filter dropdown */
        .filter-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          z-index: 100;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 18px 18px 14px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.06);
          min-width: 260px;
        }
        .filter-dropdown-label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #94a3b8;
          margin: 0 0 12px;
        }
        .filter-date-row {
          display: flex;
          gap: 10px;
        }
        .filter-field {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .filter-field-label {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .filter-input {
          padding: 7px 10px;
          border: 1.5px solid #e2e8f0;
          border-radius: 7px;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          color: #1e293b;
          outline: none;
          transition: border-color 0.15s ease;
          width: 100%;
          background: #fff;
        }
        .filter-input:focus {
          border-color: #4f63d2;
          box-shadow: 0 0 0 2px rgba(79,99,210,0.1);
        }
        .filter-dropdown-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 14px;
        }
        .btn-filter-action {
          padding: 6px 14px;
          border-radius: 6px;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: background 0.15s ease;
        }
        .btn-filter-clear {
          background: #f1f5f9;
          color: #64748b;
        }
        .btn-filter-clear:hover { background: #e2e8f0; }
        .btn-filter-apply {
          background: #4f63d2;
          color: #ffffff;
        }
        .btn-filter-apply:hover { background: #3d50bf; }

        /* Tabs */
        .projects-tabs-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1.5px solid #e2e8f0;
          padding-bottom: 0;
        }
        .projects-tabs {
          display: flex;
          gap: 0;
        }
        .projects-tab {
          padding: 10px 20px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: #94a3b8;
          cursor: pointer;
          transition: color 0.15s ease, border-color 0.15s ease;
          margin-bottom: -1.5px;
        }
        .projects-tab:hover { color: #64748b; }
        .projects-tab--active {
          color: #4f63d2;
          border-bottom-color: #4f63d2;
        }
        .projects-count {
          font-size: 12px;
          font-weight: 500;
          color: #94a3b8;
          padding-right: 2px;
        }

        /* Projects list */
        .projects-list {
          min-height: 320px;
        }

        /* Empty states */
        .empty-state-full {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 72px 32px;
          text-align: center;
          gap: 12px;
        }
        .empty-state-illustration {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          margin-bottom: 4px;
        }
        .empty-state-title {
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: 22px;
          font-weight: 400;
          color: #1a2340;
          margin: 0;
        }
        .empty-state-desc {
          font-size: 14px;
          color: #64748b;
          margin: 0;
          max-width: 380px;
          line-height: 1.65;
        }
        .empty-state-action {
          margin-top: 8px;
        }

        /* Dropdown backdrop */
        .dropdown-backdrop {
          position: fixed;
          inset: 0;
          z-index: 99;
        }

        /* Responsive */
        @media (max-width: 900px) {
          .page-header, .projects-content {
            padding-left: 24px;
            padding-right: 24px;
          }
        }
        @media (max-width: 600px) {
          .projects-toolbar { flex-direction: column; align-items: stretch; }
          .search-box { max-width: none; }
          .toolbar-filters { flex-wrap: wrap; }
          .page-header { padding-top: 24px; }
          .page-header-title { font-size: 24px; }
        }
      `}</style>
    </div>);
}
function ActiveEmptyState({ onNew }) {
    return (<div className="empty-state-full">
      <div className="empty-state-illustration">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 7a2 2 0 0 1 2-2h4l2 3h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7z"/>
          <line x1="12" y1="12" x2="12" y2="17"/>
          <line x1="9.5" y1="14.5" x2="14.5" y2="14.5"/>
        </svg>
      </div>
      <h2 className="empty-state-title">Nothing to show yet.</h2>
      <p className="empty-state-desc">
        Create your first project to start tracking your progress. Organise your work, log entries, and watch your hours build up.
      </p>
      <div className="empty-state-action">
        <button className="btn btn-primary" onClick={onNew}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Create First Project
        </button>
      </div>
    </div>);
}
function ArchivedEmptyState() {
    return (<div className="empty-state-full">
      <div className="empty-state-illustration">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="21 8 21 21 3 21 3 8"/>
          <rect x="1" y="3" width="22" height="5"/>
          <line x1="10" y1="12" x2="14" y2="12"/>
        </svg>
      </div>
      <h2 className="empty-state-title">No archived projects.</h2>
      <p className="empty-state-desc">
        Archived projects will appear here. You can archive a project from its details page when it's complete.
      </p>
    </div>);
}
function IconSearch() {
    return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>);
}
function IconX({ size = 16 }) {
    return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>);
}
function IconCalendar() {
    return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>);
}
function IconClock() {
    return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>);
}
