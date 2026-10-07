import NotificationsPanel from "./NotificationsPanel";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { fetchDashboard, saveDashboardLayout } from "../../api/dashboardApi";

const EMPTY_DASHBOARD = {
  stats: {
    loggedMinutes: 0,
    activeProjects: 0,
    totalEntries: 0,
    thisWeekMinutes: 0,
  },
  overview: {
    projectsCreated: 0,
    projectsArchived: 0,
    entriesLogged: 0,
    averageSessionMinutes: 0,
  },
  recentActivity: [],
};

const DEFAULT_WIDGET_LAYOUT = [
  { id: "default-hours", statisticId: "loggedMinutes" },
  { id: "default-active-projects", statisticId: "activeProjects" },
  { id: "default-total-entries", statisticId: "totalEntries" },
  { id: "default-this-week", statisticId: "thisWeekMinutes" },
];

const STATISTIC_OPTIONS = [
  { id: "loggedMinutes", label: "Hours Logged", source: "stats", format: "hours", icon: "clock" },
  { id: "activeProjects", label: "Active Projects", source: "stats", format: "number", icon: "folder" },
  { id: "totalEntries", label: "Total Entries", source: "stats", format: "number", icon: "entry" },
  { id: "thisWeekMinutes", label: "This Week", source: "stats", format: "hours", icon: "calendar" },
  { id: "projectsCreated", label: "Projects Created", source: "overview", format: "number", icon: "folder" },
  { id: "projectsArchived", label: "Projects Archived", source: "overview", format: "number", icon: "folder" },
  { id: "entriesLogged", label: "Entries Logged", source: "overview", format: "number", icon: "entry" },
  { id: "averageSessionMinutes", label: "Average Session", source: "overview", format: "duration", icon: "clock" },
];

const ONBOARDING_STORAGE_KEY =
  "digitalLogbookOnboardingComplete";

const ONBOARDING_STEPS = [
  {
    title: "Create a project",
    description:
      "Projects help you organise the work you want to track. Start by creating a project for an assignment, module, research task, or any other piece of work.",
  },
  {
    title: "Open your project",
    description:
      "Open a project to view its logbook, existing entries, project fields, and the different ways you can review your work.",
  },
  {
    title: "Create your first entry",
    description:
      "Entries record what you worked on, how much time you spent, and any extra information that is useful for that project.",
  },
  {
    title: "Track and review your work",
    description:
      "Use the timeline, Calendar, Board, filters, and statistics to review your progress and find previous work quickly.",
  },
];

export default function Dashboard() {
  const [collapsed, setCollapsed] =
    useState(false);
  const [dashboard, setDashboard] =
    useState(EMPTY_DASHBOARD);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");
  const [widgetLayout, setWidgetLayout] =
    useState(DEFAULT_WIDGET_LAYOUT);
  const [draftWidgetLayout, setDraftWidgetLayout] =
    useState(DEFAULT_WIDGET_LAYOUT);
  const [isCustomizing, setIsCustomizing] =
    useState(false);
  const [selectedStatisticId, setSelectedStatisticId] =
    useState("loggedMinutes");
  const [savingLayout, setSavingLayout] =
    useState(false);
  const [layoutError, setLayoutError] =
    useState("");
  const [showOnboarding, setShowOnboarding] =
    useState(false);
  const [onboardingStep, setOnboardingStep] =
    useState(0);

  const navigate = useNavigate();
  const location = useLocation();

  const restartOnboarding = useCallback(() => {
    setOnboardingStep(0);
    setShowOnboarding(true);
  }, []);

  useEffect(() => {
    if (location.state?.openOnboarding !== true) return;

    restartOnboarding();
    const remainingState = { ...location.state };
    delete remainingState.openOnboarding;
    navigate(
      { pathname: location.pathname, search: location.search, hash: location.hash },
      { replace: true, state: remainingState },
    );
  }, [location, navigate, restartOnboarding]);

  useEffect(() => {
    try {
      const completed =
        window.localStorage.getItem(
          ONBOARDING_STORAGE_KEY,
        ) === "true";

      if (!completed) {
        setShowOnboarding(true);
      }
    } catch (storageError) {
      console.warn(
        "Could not read onboarding preference:",
        storageError,
      );
      setShowOnboarding(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const data =
          await fetchDashboard();

        if (!cancelled) {
          setDashboard({
            stats: {
              ...EMPTY_DASHBOARD.stats,
              ...(data?.stats || {}),
            },
            overview: {
              ...EMPTY_DASHBOARD.overview,
              ...(data?.overview || {}),
            },
            recentActivity:
              Array.isArray(
                data?.recentActivity,
              )
                ? data.recentActivity
                : [],
          });

          const loadedLayout = Array.isArray(data?.layout)
            ? data.layout
            : DEFAULT_WIDGET_LAYOUT;
          setWidgetLayout(loadedLayout);
          setDraftWidgetLayout(loadedLayout);
        }
      } catch (requestError) {
        console.error(
          "Failed to load dashboard:",
          requestError,
        );

        if (!cancelled) {
          setError(
            requestError.message ||
              "Failed to load dashboard.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  function finishOnboarding() {
    try {
      window.localStorage.setItem(
        ONBOARDING_STORAGE_KEY,
        "true",
      );
    } catch (storageError) {
      console.warn(
        "Could not save onboarding preference:",
        storageError,
      );
    }

    setShowOnboarding(false);
    setOnboardingStep(0);
  }

  function nextOnboardingStep() {
    if (onboardingStep === ONBOARDING_STEPS.length - 1) {
      finishOnboarding();
      return;
    }

    setOnboardingStep((current) =>
      Math.min(current + 1, ONBOARDING_STEPS.length - 1),
    );
  }

  function previousOnboardingStep() {
    setOnboardingStep((current) => Math.max(current - 1, 0));
  }

  function startCustomizing() {
    setDraftWidgetLayout(widgetLayout.map((widget) => ({ ...widget })));
    setLayoutError("");
    setIsCustomizing(true);
  }

  function cancelCustomizing() {
    setDraftWidgetLayout(widgetLayout.map((widget) => ({ ...widget })));
    setLayoutError("");
    setIsCustomizing(false);
  }

  function addWidget() {
    if (draftWidgetLayout.length >= 12) {
      setLayoutError("You can add up to 12 dashboard widgets.");
      return;
    }

    const widget = {
      id: `widget-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      statisticId: selectedStatisticId,
    };

    setDraftWidgetLayout((current) => [...current, widget]);
    setLayoutError("");
  }

  function removeWidget(widgetId) {
    setDraftWidgetLayout((current) =>
      current.filter((widget) => widget.id !== widgetId),
    );
  }

  function updateWidgetStatistic(widgetId, statisticId) {
    setDraftWidgetLayout((current) =>
      current.map((widget) =>
        widget.id === widgetId ? { ...widget, statisticId } : widget,
      ),
    );
  }

  function moveWidget(widgetId, direction) {
    setDraftWidgetLayout((current) => {
      const index = current.findIndex((widget) => widget.id === widgetId);
      const nextIndex = index + direction;

      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const reordered = [...current];
      const [widget] = reordered.splice(index, 1);
      reordered.splice(nextIndex, 0, widget);
      return reordered;
    });
  }

  async function saveCustomDashboard() {
    try {
      setSavingLayout(true);
      setLayoutError("");
      const savedLayout = await saveDashboardLayout(draftWidgetLayout);
      setWidgetLayout(savedLayout);
      setDraftWidgetLayout(savedLayout);
      setIsCustomizing(false);
    } catch (saveError) {
      setLayoutError(
        saveError.message || "Failed to save dashboard layout.",
      );
    } finally {
      setSavingLayout(false);
    }
  }

  const { stats, overview, recentActivity } =
    dashboard;

  const hasNoProjects =
    overview.projectsCreated === 0;

  return (
    <div className="app-shell">
      <Sidebar
        collapsed={collapsed}
        onToggle={() =>
          setCollapsed((c) => !c)
        }
      />

      <main className="app-main">
        {/* Page header */}
        <header className="page-header">
          <div>
            <p className="page-header-eyebrow">
              Dashboard
            </p>
            <h1 className="page-header-title">
              Welcome back
            </h1>
          </div>

          <div className="page-header-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={isCustomizing ? cancelCustomizing : startCustomizing}
            >
              {isCustomizing ? "Cancel customization" : "Customize dashboard widgets"}
            </button>

            <button
              className="btn btn-primary"
              onClick={() =>
                navigate("/projects")
              }
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line
                  x1="12"
                  y1="5"
                  x2="12"
                  y2="19"
                />
                <line
                  x1="5"
                  y1="12"
                  x2="19"
                  y2="12"
                />
              </svg>
              New Project
            </button>
          </div>
        </header>

        <div className="dashboard-content">
          {error && (
            <div
              className="dashboard-error"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Custom dashboard widgets */}
          <section className="custom-dashboard-section">
            {isCustomizing && (
              <div className="dashboard-customizer" aria-label="Dashboard customization controls">
                <div>
                  <h2 className="dashboard-customizer-title">Customize dashboard widgets</h2>
                  <p className="dashboard-customizer-copy">
                    Add, remove, change, and reorder the statistics shown on your dashboard.
                  </p>
                </div>

                <div className="dashboard-customizer-actions">
                  <select
                    aria-label="Statistic to add"
                    className="dashboard-stat-select"
                    value={selectedStatisticId}
                    onChange={(event) => setSelectedStatisticId(event.target.value)}
                  >
                    {STATISTIC_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn btn-secondary" onClick={addWidget}>
                    Add Widget
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={saveCustomDashboard}
                    disabled={savingLayout}
                  >
                    {savingLayout ? "Saving..." : "Save Layout"}
                  </button>
                </div>
              </div>
            )}

            {layoutError && (
              <div className="dashboard-error" role="alert">
                {layoutError}
              </div>
            )}

            {(isCustomizing ? draftWidgetLayout : widgetLayout).length === 0 ? (
              <div className="dashboard-empty-layout">
                <p className="empty-heading">Your dashboard is empty.</p>
                <p className="empty-body">
                  {isCustomizing
                    ? "Choose a statistic above and add your first widget."
                    : "Customize your dashboard to add the statistics you care about most."}
                </p>
                {!isCustomizing && (
                  <button type="button" className="btn btn-primary" onClick={startCustomizing}>
                    Add a Widget
                  </button>
                )}
              </div>
            ) : (
              <div className="stat-grid">
                {(isCustomizing ? draftWidgetLayout : widgetLayout).map((widget, index, currentLayout) => (
                  <DashboardStatWidget
                    key={widget.id}
                    widget={widget}
                    dashboard={dashboard}
                    loading={loading}
                    customizing={isCustomizing}
                    first={index === 0}
                    last={index === currentLayout.length - 1}
                    onMove={moveWidget}
                    onRemove={removeWidget}
                    onStatisticChange={updateWidgetStatistic}
                  />
                ))}
              </div>
            )}
          </section>

          <div className="dashboard-columns">
            {/* Recent Activity */}
            <section className="dash-card dash-activity">
              <div className="dash-card-header">
                <h2 className="dash-card-title">
                  Recent Activity
                </h2>
              </div>

              {loading ? (
                <div className="empty-state">
                  <p className="empty-heading">
                    Loading activity...
                  </p>
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <IconActivity />
                  </div>
                  <p className="empty-heading">
                    No activity to show yet.
                  </p>
                  <p className="empty-body">
                    Your recent project entries and
                    updates will appear here once you
                    start logging work.
                  </p>
                </div>
              ) : (
                <div className="activity-list">
                  {recentActivity.map(
                    (activity) => (
                      <div
                        className="activity-row"
                        key={activity.entryId}
                      >
                        <div className="activity-icon">
                          <IconEntry />
                        </div>

                        <div className="activity-main">
                          <p className="activity-title">
                            {activity.entryName ||
                              "Logbook Entry"}
                          </p>
                          <p className="activity-meta">
                            {activity.projectName ||
                              "Project"}
                            {" · "}
                            {formatDateTime(
                              activity.occurredAt,
                            )}
                          </p>
                        </div>

                        <span className="activity-duration">
                          {formatDuration(
                            activity.durationMinutes,
                          )}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              )}
            </section>

            {/* Right column */}
            <div className="dashboard-right">
              {/* Get started */}
              <section className="dash-card dash-get-started">
                <div className="dash-card-header">
                  <h2 className="dash-card-title">
                    Get Started
                  </h2>
                </div>

                <div className="get-started-body">
                  <div className="get-started-icon">
                    <IconRocket />
                  </div>

                  <p className="get-started-heading">
                    {hasNoProjects
                      ? "Start your journey."
                      : "Keep your logbook moving."}
                  </p>

                  <p className="get-started-body-text">
                    {hasNoProjects
                      ? "You haven't started a project yet. Organise your work and track your growth by creating your first digital logbook entry."
                      : "Open your projects to continue logging work and building your project record."}
                  </p>

                  <button
                    className="btn btn-primary btn-full"
                    onClick={() =>
                      navigate("/projects")
                    }
                  >
                    {hasNoProjects
                      ? "Create First Project"
                      : "View Projects"}
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-full"
                    onClick={restartOnboarding}
                  >
                    Show Getting Started Guide
                  </button>
                </div>
              </section>

              {/* Quick stats */}
              <section className="dash-card">
                <div className="dash-card-header">
                  <h2 className="dash-card-title">
                    Overview
                  </h2>

                  <button
                    className="dash-link"
                    onClick={() =>
                      navigate("/stats")
                    }
                  >
                    View all stats
                  </button>
                </div>

                <div className="overview-list">
                  <OverviewRow
                    label="Projects created"
                    value={
                      loading
                        ? "—"
                        : overview.projectsCreated
                    }
                  />

                  <OverviewRow
                    label="Projects archived"
                    value={
                      loading
                        ? "—"
                        : overview.projectsArchived
                    }
                  />

                  <OverviewRow
                    label="Entries logged"
                    value={
                      loading
                        ? "—"
                        : overview.entriesLogged
                    }
                  />

                  <OverviewRow
                    label="Average session"
                    value={
                      loading
                        ? "—"
                        : formatDuration(
                            overview.averageSessionMinutes,
                          )
                    }
                  />
                </div>
              </section>
            </div>
          </div>
        </div>

        <NotificationsPanel />
      </main>

      {showOnboarding && (
        <div className="onboarding-overlay">
          <section
            className="onboarding-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-title"
          >
            <div className="onboarding-topbar">
              <span className="onboarding-badge">
                Getting Started
              </span>
              <button
                type="button"
                className="onboarding-skip"
                onClick={finishOnboarding}
              >
                Skip guide
              </button>
            </div>

            <div className="onboarding-progress">
              {ONBOARDING_STEPS.map((step, index) => (
                <span
                  key={step.title}
                  className={`onboarding-progress-dot ${
                    index <= onboardingStep ? "is-active" : ""
                  }`}
                  aria-hidden="true"
                />
              ))}
            </div>

            <p className="onboarding-step-label">
              Step {onboardingStep + 1} of {ONBOARDING_STEPS.length}
            </p>
            <h2
              className="onboarding-title"
              id="onboarding-title"
            >
              {ONBOARDING_STEPS[onboardingStep].title}
            </h2>
            <p className="onboarding-description">
              {ONBOARDING_STEPS[onboardingStep].description}
            </p>

            <div className="onboarding-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={previousOnboardingStep}
                disabled={onboardingStep === 0}
              >
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={nextOnboardingStep}
              >
                {onboardingStep === ONBOARDING_STEPS.length - 1
                  ? "Get Started"
                  : "Next"}
              </button>
            </div>
          </section>
        </div>
      )}

      <style>{`
        .app-shell {
          display: flex;
          min-height: 100vh;
          background: var(--bg, #f8fafc);
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
          color: var(--text-faint, #94a3b8);
          margin: 0 0 4px;
        }
        .page-header-title {
          font-family: var(--font-display, 'DM Serif Display', Georgia, serif);
          font-size: 30px;
          font-weight: 400;
          color: var(--text-strong, #1a2340);
          margin: 0;
        }
        .page-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        /* Buttons: base .btn system now lives in index.css (design tokens) */

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

        .dashboard-error {
          padding: 11px 14px;
          border: 1px solid var(--danger-border, #fecaca);
          border-radius: var(--radius-md, 8px);
          background: var(--danger-soft, #fef2f2);
          color: var(--danger-text, #b91c1c);
          font-size: 13px;
        }

        .custom-dashboard-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .dashboard-customizer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 18px 20px;
          border: 1px solid var(--border-strong, #cbd5e1);
          border-radius: var(--radius-lg, 12px);
          background: var(--surface, #ffffff);
        }
        .dashboard-customizer-title {
          margin: 0;
          color: var(--text-strong, #1a2340);
          font-size: 15px;
          font-weight: 600;
        }
        .dashboard-customizer-copy {
          margin: 5px 0 0;
          color: var(--text-muted, #64748b);
          font-size: 12px;
          line-height: 1.5;
        }
        .dashboard-customizer-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .dashboard-stat-select,
        .widget-stat-select {
          min-height: 38px;
          padding: 8px 10px;
          border: 1px solid var(--border-strong, #cbd5e1);
          border-radius: var(--radius-md, 8px);
          background: var(--surface, #ffffff);
          color: var(--text, #334155);
          font: inherit;
          font-size: 13px;
        }
        .dashboard-empty-layout {
          min-height: 180px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 28px;
          border: 1px dashed var(--border-strong, #cbd5e1);
          border-radius: var(--radius-lg, 12px);
          background: var(--surface, #ffffff);
          text-align: center;
        }
        .stat-card.is-customizing {
          gap: 14px;
          border-color: var(--border-strong, #cbd5e1);
        }
        .widget-editor {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-top: 12px;
          border-top: 1px solid var(--border, #f1f5f9);
        }
        .widget-editor-actions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .widget-control-button {
          padding: 6px 9px;
          border: 1px solid var(--border-strong, #cbd5e1);
          border-radius: var(--radius-sm, 6px);
          background: var(--surface, #ffffff);
          color: var(--text-muted, #475569);
          cursor: pointer;
          font-size: 12px;
        }
        .widget-control-button:hover:not(:disabled) {
          background: var(--surface-subtle, #f8fafc);
        }
        .widget-control-button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .widget-control-button.is-danger {
          color: var(--danger-text, #b91c1c);
          border-color: var(--danger-border, #fecaca);
        }

        /* Stat grid */
        .stat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .stat-card {
          background: var(--surface, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: var(--radius-lg, 12px);
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
          color: var(--text-muted, #64748b);
        }
        .stat-card-icon {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-md, 8px);
          background: var(--surface-subtle, #f1f5f9);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted, #64748b);
        }
        .stat-card-value {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }
        .stat-card-number {
          font-family: var(--font-display, 'DM Serif Display', Georgia, serif);
          font-size: 34px;
          font-weight: 400;
          color: var(--text-strong, #1a2340);
          line-height: 1;
        }
        .stat-card-unit {
          font-size: 13px;
          color: var(--text-faint, #94a3b8);
          font-weight: 500;
        }
        .stat-card-empty-note {
          font-size: 11px;
          color: var(--border-strong, #cbd5e1);
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
          background: var(--surface, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: var(--radius-lg, 12px);
          overflow: hidden;
        }
        .dash-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 22px 16px;
          border-bottom: 1px solid var(--border, #f1f5f9);
        }
        .dash-card-title {
          font-family: var(--font-sans, 'Inter', sans-serif);
          font-size: 14px;
          font-weight: 600;
          color: var(--text-strong, #1a2340);
          margin: 0;
        }
        .dash-link {
          font-size: 12px;
          color: var(--accent, #4f63d2);
          background: none;
          border: none;
          cursor: pointer;
          font-family: var(--font-sans, 'Inter', sans-serif);
          font-weight: 500;
          padding: 0;
          text-decoration: none;
        }
        .dash-link:hover {
          color: var(--accent-hover, #3d50bf);
          text-decoration: underline;
        }

        /* Activity */
        .dash-activity {
          min-height: 340px;
          display: flex;
          flex-direction: column;
        }

        .activity-list {
          display: flex;
          flex-direction: column;
        }
        .activity-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 22px;
          border-bottom: 1px solid var(--border, #f1f5f9);
        }
        .activity-row:last-child {
          border-bottom: none;
        }
        .activity-icon {
          width: 34px;
          height: 34px;
          border-radius: var(--radius-md, 8px);
          background: var(--surface-subtle, #f1f5f9);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted, #64748b);
          flex-shrink: 0;
        }
        .activity-main {
          flex: 1;
          min-width: 0;
        }
        .activity-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-strong, #1a2340);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .activity-meta {
          font-size: 12px;
          color: var(--text-faint, #94a3b8);
          margin: 4px 0 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .activity-duration {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-muted, #64748b);
          white-space: nowrap;
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
          border-radius: var(--radius-lg, 12px);
          background: var(--surface-subtle, #f1f5f9);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-faint, #94a3b8);
          margin-bottom: 4px;
        }
        .empty-heading {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-strong, #1a2340);
          margin: 0;
        }
        .empty-body {
          font-size: 13px;
          color: var(--text-faint, #94a3b8);
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
          border-radius: var(--radius-lg, 12px);
          background: var(--accent-soft, rgba(79,99,210,0.08));
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent, #4f63d2);
          margin-bottom: 4px;
        }
        .get-started-heading {
          font-family: var(--font-display, 'DM Serif Display', Georgia, serif);
          font-size: 18px;
          font-weight: 400;
          color: var(--text-strong, #1a2340);
          margin: 0;
        }
        .get-started-body-text {
          font-size: 13px;
          color: var(--text-muted, #64748b);
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
          border-bottom: 1px solid var(--border, #f8fafc);
        }
        .overview-row:last-child {
          border-bottom: none;
        }
        .overview-row-label {
          font-size: 13px;
          color: var(--text-muted, #64748b);
        }
        .overview-row-value {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-faint, #94a3b8);
        }

        /* First-time onboarding */
        .onboarding-overlay {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(15, 23, 42, 0.55);
          z-index: 2000;
        }
        .onboarding-modal {
          width: min(520px, 100%);
          padding: 26px;
          border: 1px solid var(--border, #e2e8f0);
          border-radius: var(--radius-xl, 16px);
          background: var(--surface, #ffffff);
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.3);
        }
        .onboarding-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
        }
        .onboarding-badge {
          display: inline-flex;
          align-items: center;
          padding: 5px 9px;
          border-radius: 999px;
          background: var(--accent-soft, rgba(79, 99, 210, 0.1));
          color: var(--accent, #4f63d2);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .onboarding-skip {
          padding: 0;
          border: none;
          background: transparent;
          color: var(--text-muted, #64748b);
          cursor: pointer;
          font-family: var(--font-sans, 'Inter', sans-serif);
          font-size: 12px;
          font-weight: 500;
        }
        .onboarding-skip:hover {
          color: var(--text-strong, #1a2340);
          text-decoration: underline;
        }
        .onboarding-progress {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 7px;
          margin-bottom: 22px;
        }
        .onboarding-progress-dot {
          height: 4px;
          border-radius: 999px;
          background: var(--border, #e2e8f0);
        }
        .onboarding-progress-dot.is-active {
          background: var(--accent, #4f63d2);
        }
        .onboarding-step-label {
          margin: 0 0 8px;
          color: var(--text-faint, #94a3b8);
          font-size: 12px;
          font-weight: 600;
        }
        .onboarding-title {
          margin: 0;
          color: var(--text-strong, #1a2340);
          font-family: var(--font-display, 'DM Serif Display', Georgia, serif);
          font-size: 27px;
          font-weight: 400;
        }
        .onboarding-description {
          margin: 12px 0 0;
          color: var(--text-muted, #64748b);
          font-size: 14px;
          line-height: 1.7;
        }
        .onboarding-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 28px;
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
          .dashboard-customizer {
            align-items: stretch;
            flex-direction: column;
          }
          .dashboard-customizer-actions {
            justify-content: flex-start;
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
    </div>
  );
}

function DashboardStatWidget({
  widget,
  dashboard,
  loading,
  customizing,
  first,
  last,
  onMove,
  onRemove,
  onStatisticChange,
}) {
  const definition = STATISTIC_OPTIONS.find(
    (option) => option.id === widget.statisticId,
  );

  if (!definition) {
    return (
      <div className={`stat-card ${customizing ? "is-customizing" : ""}`}>
        <div className="stat-card-top">
          <span className="stat-card-label">Unavailable statistic</span>
          <div className="stat-card-icon"><IconEntry /></div>
        </div>
        <div className="stat-card-value">
          <span className="stat-card-number">—</span>
        </div>
        <span className="stat-card-empty-note">This statistic is no longer available.</span>
        {customizing && (
          <WidgetEditor
            widget={widget}
            first={first}
            last={last}
            onMove={onMove}
            onRemove={onRemove}
            onStatisticChange={onStatisticChange}
          />
        )}
      </div>
    );
  }

  const rawValue = dashboard[definition.source]?.[definition.id] ?? 0;
  const formatted = formatDashboardStatistic(rawValue, definition.format);

  return (
    <StatCard
      label={definition.label}
      value={loading ? "—" : formatted.value}
      unit={loading ? undefined : formatted.unit}
      icon={getStatisticIcon(definition.icon)}
      empty={!loading && Number(rawValue) === 0}
      customizing={customizing}
      editor={customizing ? (
        <WidgetEditor
          widget={widget}
          first={first}
          last={last}
          onMove={onMove}
          onRemove={onRemove}
          onStatisticChange={onStatisticChange}
        />
      ) : null}
    />
  );
}

function WidgetEditor({
  widget,
  first,
  last,
  onMove,
  onRemove,
  onStatisticChange,
}) {
  return (
    <div className="widget-editor">
      <select
        aria-label="Widget statistic"
        className="widget-stat-select"
        value={widget.statisticId}
        onChange={(event) => onStatisticChange(widget.id, event.target.value)}
      >
        {STATISTIC_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>{option.label}</option>
        ))}
      </select>
      <div className="widget-editor-actions">
        <button
          type="button"
          className="widget-control-button"
          onClick={() => onMove(widget.id, -1)}
          disabled={first}
          aria-label="Move widget left"
        >
          Move left
        </button>
        <button
          type="button"
          className="widget-control-button"
          onClick={() => onMove(widget.id, 1)}
          disabled={last}
          aria-label="Move widget right"
        >
          Move right
        </button>
        <button
          type="button"
          className="widget-control-button is-danger"
          onClick={() => onRemove(widget.id)}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function formatDashboardStatistic(value, format) {
  if (format === "hours") {
    return { value: formatHours(value), unit: "hrs" };
  }

  if (format === "duration") {
    return { value: formatDuration(value), unit: undefined };
  }

  return { value: Number(value) || 0, unit: undefined };
}

function getStatisticIcon(icon) {
  switch (icon) {
    case "clock":
      return <IconClock />;
    case "folder":
      return <IconFolder />;
    case "calendar":
      return <IconCalendar />;
    default:
      return <IconEntry />;
  }
}

function StatCard({
  label,
  value,
  unit,
  icon,
  empty,
  customizing = false,
  editor = null,
}) {
  return (
    <div className={`stat-card ${customizing ? "is-customizing" : ""}`}>
      <div className="stat-card-top">
        <span className="stat-card-label">
          {label}
        </span>
        <div className="stat-card-icon">
          {icon}
        </div>
      </div>

      <div className="stat-card-value">
        <span className="stat-card-number">
          {value}
        </span>
        {unit && (
          <span className="stat-card-unit">
            {unit}
          </span>
        )}
      </div>

      {empty && (
        <span className="stat-card-empty-note">
          Nothing logged yet
        </span>
      )}

      {editor}
    </div>
  );
}

function OverviewRow({
  label,
  value,
}) {
  return (
    <div className="overview-row">
      <span className="overview-row-label">
        {label}
      </span>
      <span className="overview-row-value">
        {value}
      </span>
    </div>
  );
}

function formatHours(minutes = 0) {
  const hours =
    (Number(minutes) || 0) / 60;

  if (Number.isInteger(hours)) {
    return String(hours);
  }

  return hours.toFixed(1);
}

function formatDuration(minutes = 0) {
  const safeMinutes =
    Number(minutes) || 0;

  if (safeMinutes === 0) {
    return "0 min";
  }

  const hours =
    Math.floor(safeMinutes / 60);
  const remainingMinutes =
    safeMinutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }

  if (remainingMinutes === 0) {
    return `${hours} hrs`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

function formatDateTime(value) {
  if (!value) {
    return "Unknown time";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat(
    "en-ZA",
    {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

function IconClock() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
      />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconFolder() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 7a2 2 0 0 1 2-2h4l2 3h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7z" />
    </svg>
  );
}

function IconEntry() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line
        x1="9"
        y1="13"
        x2="15"
        y2="13"
      />
      <line
        x1="9"
        y1="17"
        x2="13"
        y2="17"
      />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="18"
        rx="2"
      />
      <line
        x1="16"
        y1="2"
        x2="16"
        y2="6"
      />
      <line
        x1="8"
        y1="2"
        x2="8"
        y2="6"
      />
      <line
        x1="3"
        y1="10"
        x2="21"
        y2="10"
      />
    </svg>
  );
}

function IconActivity() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function IconRocket() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}
