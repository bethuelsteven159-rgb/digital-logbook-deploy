import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Sidebar from "../../components/Sidebar";

import {
  fetchProjects,
} from "../../api/projectsApi";

import {
  fetchProjectDetails,
} from "../../api/projectDetailsApi";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/$/, "");

function getAuthToken() {
  return localStorage.getItem("authToken");
}

async function fetchStatistics(params) {
  const token = getAuthToken();

  if (!token) {
    const error = new Error(
      "Authentication required. Please sign in again.",
    );
    error.status = 401;
    throw error;
  }

  const {
    projectId,
    ...queryParams
  } = params;

  if (!projectId) {
    throw new Error("Project ID is required.");
  }

  const query = new URLSearchParams(
    queryParams,
  ).toString();

  const response = await fetch(
    `${API_URL}/api/stats/projects/${projectId}?${query}`,
    {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const contentType =
    response.headers.get("content-type");

  const body =
    contentType?.includes("application/json")
      ? await response.json()
      : null;

  if (!response.ok) {
    const error = new Error(
      body?.message ||
        body?.error?.message ||
        body?.error ||
        `Request failed with status ${response.status}`,
    );

    error.status = response.status;
    error.body = body;

    throw error;
  }

  return body;
}

export default function Stats() {
  const [collapsed, setCollapsed] =
    useState(false);

  const [projects, setProjects] =
    useState([]);

  const [projectDetails, setProjectDetails] =
    useState({});

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [selectedProjectId, setSelectedProjectId] =
    useState("");

  const [selectedFieldId, setSelectedFieldId] =
    useState("");

  const [compareFieldId, setCompareFieldId] =
    useState("");

  const [operation, setOperation] =
    useState("total");

  const [statistics, setStatistics] =
    useState(null);

  const [statisticsLoading, setStatisticsLoading] =
    useState(false);

  const [statisticsError, setStatisticsError] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadStatisticsPage() {
      try {
        setLoading(true);
        setError("");

        const projectData =
          await fetchProjects("active");

        const loadedProjects =
          Array.isArray(projectData)
            ? projectData
            : Array.isArray(projectData?.projects)
              ? projectData.projects
              : [];

        if (cancelled) {
          return;
        }

        setProjects(loadedProjects);

        if (loadedProjects.length > 0) {
          setSelectedProjectId(
            loadedProjects[0].id,
          );
        }

        const detailsResults =
          await Promise.all(
            loadedProjects.map(async (project) => {
              try {
                const result =
                  await fetchProjectDetails(
                    project.id,
                  );

                return [
                  project.id,
                  result,
                ];
              } catch (requestError) {
                console.error(
                  `Failed to load project ${project.id}:`,
                  requestError,
                );

                return [
                  project.id,
                  null,
                ];
              }
            }),
          );

        if (cancelled) {
          return;
        }

        setProjectDetails(
          Object.fromEntries(detailsResults),
        );
      } catch (requestError) {
        console.error(
          "Failed to load statistics:",
          requestError,
        );

        if (!cancelled) {
          setError(
            requestError.message ||
              "Unable to load statistics.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStatisticsPage();

    return () => {
      cancelled = true;
    };
  }, []);

  const allEntries = useMemo(() => {
    return Object.values(projectDetails)
      .flatMap((details) => {
        if (!details) {
          return [];
        }

        if (Array.isArray(details.entries)) {
          return details.entries;
        }

        if (
          Array.isArray(
            details?.data?.entries,
          )
        ) {
          return details.data.entries;
        }

        return [];
      });
  }, [projectDetails]);

  const totalMinutes = useMemo(() => {
    return allEntries.reduce(
      (total, entry) =>
        total +
        Number(entry.durationMinutes || 0),
      0,
    );
  }, [allEntries]);

  const selectedProject =
    projectDetails[selectedProjectId] || null;

  const selectedEntries = useMemo(() => {
    if (!selectedProject) {
      return [];
    }

    if (
      Array.isArray(selectedProject.entries)
    ) {
      return selectedProject.entries;
    }

    if (
      Array.isArray(
        selectedProject?.data?.entries,
      )
    ) {
      return selectedProject.data.entries;
    }

    return [];
  }, [selectedProject]);

  const selectedFields = useMemo(() => {
    if (!selectedProject) {
      return [];
    }

    const fields =
      Array.isArray(selectedProject.fields)
        ? selectedProject.fields
        : Array.isArray(
            selectedProject?.data?.fields,
          )
          ? selectedProject.data.fields
          : [];

    return fields.filter(
      (field) =>
        field.archivedAt == null &&
        field.fieldType !== "computed",
    );
  }, [selectedProject]);

  const numericFields = useMemo(() => {
    return selectedFields.filter(
      (field) =>
        field.fieldType === "number",
    );
  }, [selectedFields]);

  useEffect(() => {
    setSelectedFieldId("");
    setCompareFieldId("");
    setStatistics(null);
    setStatisticsError("");
  }, [selectedProjectId]);

  useEffect(() => {
    setStatistics(null);
    setStatisticsError("");

    if (
      operation === "compare" &&
      selectedFieldId === compareFieldId
    ) {
      setCompareFieldId("");
    }
  }, [
    operation,
    selectedFieldId,
    compareFieldId,
  ]);

  async function handleLoadStatistics() {
    if (!selectedProjectId) {
      setStatisticsError(
        "Select a project first.",
      );
      return;
    }

    if (!selectedFieldId) {
      setStatisticsError(
        "Select a field first.",
      );
      return;
    }

    if (
      operation === "compare" &&
      !compareFieldId
    ) {
      setStatisticsError(
        "Select a second numeric field to compare.",
      );
      return;
    }

    if (
      operation === "compare" &&
      selectedFieldId === compareFieldId
    ) {
      setStatisticsError(
        "Choose two different fields to compare.",
      );
      return;
    }

    try {
      setStatisticsLoading(true);
      setStatisticsError("");

      const params = {
        operation,
        projectId: selectedProjectId,
        fieldId: selectedFieldId,
      };

      if (
        operation === "compare" &&
        compareFieldId
      ) {
        params.compareFieldId =
          compareFieldId;
      }

      const result =
        await fetchStatistics(params);

      setStatistics(result);
    } catch (requestError) {
      console.error(
        "Failed to load field statistics:",
        requestError,
      );

      setStatisticsError(
        requestError.message ||
          "Unable to load field statistics.",
      );

      setStatistics(null);
    } finally {
      setStatisticsLoading(false);
    }
  }

  const recentEntries = useMemo(() => {
    return [...allEntries]
      .sort((a, b) => {
        const dateA = new Date(
          a.occurredAt ||
            a.createdAt ||
            0,
        ).getTime();

        const dateB = new Date(
          b.occurredAt ||
            b.createdAt ||
            0,
        ).getTime();

        return dateB - dateA;
      })
      .slice(0, 8);
  }, [allEntries]);

  function formatMinutes(minutes) {
    const value = Number(minutes || 0);

    const hours = Math.floor(
      value / 60,
    );

    const remaining = value % 60;

    if (hours === 0) {
      return `${remaining}m`;
    }

    if (remaining === 0) {
      return `${hours}h`;
    }

    return `${hours}h ${remaining}m`;
  }

  function formatDate(value) {
    if (!value) {
      return "No date";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "No date";
    }

    return date.toLocaleDateString(
      undefined,
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      },
    );
  }

  return (
    <div className="stats-shell">
      <Sidebar
        collapsed={collapsed}
        onToggle={() =>
          setCollapsed(
            (current) => !current,
          )
        }
      />

      <main className="stats-main">
        <header className="stats-header">
          <div>
            <p className="stats-eyebrow">
              Statistics
            </p>

            <h1 className="stats-title">
              Your progress
            </h1>

            <p className="stats-subtitle">
              See how your projects, entries and
              logged time develop over time.
            </p>
          </div>
        </header>

        <div className="stats-content">
          {loading && (
            <div className="stats-loading">
              Loading your statistics...
            </div>
          )}

          {error && (
            <div className="stats-error">
              {error}
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="stats-summary-grid">
                <SummaryCard
                  label="Total time"
                  value={formatMinutes(
                    totalMinutes,
                  )}
                  icon={<IconClock />}
                />

                <SummaryCard
                  label="Projects"
                  value={projects.length}
                  icon={<IconFolder />}
                />

                <SummaryCard
                  label="Entries"
                  value={allEntries.length}
                  icon={<IconEntry />}
                />
              </div>

              <section className="stats-panel">
                <div className="stats-panel-heading">
                  <div>
                    <h2>
                      Activity overview
                    </h2>

                    <span>
                      Your latest logbook activity
                    </span>
                  </div>
                </div>

                {recentEntries.length === 0 ? (
                  <div className="stats-empty">
                    <div className="stats-empty-icon">
                      <IconChart />
                    </div>

                    <h3>
                      Nothing to show yet.
                    </h3>

                    <p>
                      Create an entry to start
                      tracking your activity.
                    </p>
                  </div>
                ) : (
                  <div className="activity-list">
                    {recentEntries.map(
                      (entry) => (
                        <div
                          className="activity-row"
                          key={entry.id}
                        >
                          <div>
                            <strong>
                              {entry.name ||
                                "Logbook Entry"}
                            </strong>

                            <span>
                              {formatDate(
                                entry.occurredAt ||
                                  entry.createdAt,
                              )}
                            </span>
                          </div>

                          <span className="activity-duration">
                            <IconClock />

                            {formatMinutes(
                              entry.durationMinutes,
                            )}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </section>

              <section className="stats-panel">
                <div className="stats-panel-heading">
                  <div>
                    <h2>
                      Custom field statistics
                    </h2>

                    <span>
                      Analyse values from your
                      project fields
                    </span>
                  </div>
                </div>

                <div className="stats-controls">
                  <div className="stats-control">
                    <label htmlFor="stats-project">
                      Project
                    </label>

                    <select
                      id="stats-project"
                      value={selectedProjectId}
                      onChange={(event) =>
                        setSelectedProjectId(
                          event.target.value,
                        )
                      }
                    >
                      <option value="">
                        Select a project
                      </option>

                      {projects.map(
                        (project) => (
                          <option
                            key={project.id}
                            value={project.id}
                          >
                            {project.name}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div className="stats-control">
                    <label htmlFor="stats-field">
                      Field
                    </label>

                    <select
                      id="stats-field"
                      value={selectedFieldId}
                      onChange={(event) =>
                        setSelectedFieldId(
                          event.target.value,
                        )
                      }
                      disabled={
                        selectedFields.length ===
                        0
                      }
                    >
                      <option value="">
                        {selectedFields.length ===
                        0
                          ? "No supported fields"
                          : "Select a field"}
                      </option>

                      {selectedFields.map(
                        (field) => (
                          <option
                            key={field.id}
                            value={field.id}
                          >
                            {field.name}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div className="stats-control">
                    <label htmlFor="stats-operation">
                      Operation
                    </label>

                    <select
                      id="stats-operation"
                      value={operation}
                      onChange={(event) =>
                        setOperation(
                          event.target.value,
                        )
                      }
                    >
                      <option value="total">
                        Total
                      </option>

                      <option value="group">
                        Group
                      </option>

                      <option value="compare">
                        Compare
                      </option>

                      <option value="plot">
                        Plot
                      </option>
                    </select>
                  </div>

                  {operation === "compare" && (
                    <div className="stats-control">
                      <label htmlFor="stats-compare-field">
                        Compare with
                      </label>

                      <select
                        id="stats-compare-field"
                        value={compareFieldId}
                        onChange={(event) =>
                          setCompareFieldId(
                            event.target.value,
                          )
                        }
                      >
                        <option value="">
                          Select numeric field
                        </option>

                        {numericFields
                          .filter(
                            (field) =>
                              field.id !==
                              selectedFieldId,
                          )
                          .map((field) => (
                            <option
                              key={field.id}
                              value={field.id}
                            >
                              {field.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  <button
                    type="button"
                    className="stats-load-btn"
                    onClick={
                      handleLoadStatistics
                    }
                    disabled={
                      statisticsLoading ||
                      !selectedProjectId ||
                      !selectedFieldId ||
                      (operation ===
                        "compare" &&
                        !compareFieldId)
                    }
                  >
                    {statisticsLoading
                      ? "Loading..."
                      : "Show Statistics"}
                  </button>
                </div>

                {statisticsError && (
                  <div className="stats-inline-error">
                    {statisticsError}
                  </div>
                )}

                {statistics && (
                  <StatisticsResult
                    statistics={statistics}
                    operation={operation}
                  />
                )}

                {!statistics &&
                  !statisticsError && (
                    <div className="stats-selection-empty">
                      Select a project and field to
                      view statistics.
                    </div>
                  )}
              </section>

              <div className="stats-detail-grid">
                <section className="stats-detail-card">
                  <div className="stats-detail-card-top">
                    <span className="stats-detail-icon">
                      <IconFolder />
                    </span>

                    <h2>
                      Project statistics
                    </h2>
                  </div>

                  {projects.length === 0 ? (
                    <p>
                      No projects have been created
                      yet.
                    </p>
                  ) : (
                    <div className="project-stats-list">
                      {projects.map(
                        (project) => {
                          const details =
                            projectDetails[
                              project.id
                            ];

                          const entries =
                            Array.isArray(
                              details?.entries,
                            )
                              ? details.entries
                              : Array.isArray(
                                  details
                                    ?.data
                                    ?.entries,
                                )
                                ? details.data
                                    .entries
                                : [];

                          const minutes =
                            entries.reduce(
                              (
                                total,
                                entry,
                              ) =>
                                total +
                                Number(
                                  entry.durationMinutes ||
                                    0,
                                ),
                              0,
                            );

                          return (
                            <div
                              className="project-stat-row"
                              key={project.id}
                            >
                              <div>
                                <strong>
                                  {project.name}
                                </strong>

                                <span>
                                  {
                                    entries.length
                                  }{" "}
                                  {entries.length ===
                                  1
                                    ? "entry"
                                    : "entries"}
                                </span>
                              </div>

                              <span>
                                {formatMinutes(
                                  minutes,
                                )}
                              </span>
                            </div>
                          );
                        },
                      )}
                    </div>
                  )}
                </section>

                <section className="stats-detail-card">
                  <div className="stats-detail-card-top">
                    <span className="stats-detail-icon">
                      <IconEntry />
                    </span>

                    <h2>
                      Entry statistics
                    </h2>
                  </div>

                  <div className="entry-summary">
                    <div>
                      <span>
                        Total entries
                      </span>

                      <strong>
                        {allEntries.length}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Logged time
                      </span>

                      <strong>
                        {formatMinutes(
                          totalMinutes,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Completed
                      </span>

                      <strong>
                        {
                          allEntries.filter(
                            (entry) =>
                              Boolean(
                                entry.completedAt,
                              ),
                          ).length
                        }
                      </strong>
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}
        </div>
      </main>

      <style>{`
        .stats-shell {
          display: flex;
          min-height: 100vh;
          background: #f8fafc;
        }

        .stats-main {
          flex: 1;
          min-width: 0;
          overflow-x: hidden;
        }

        .stats-header {
          padding: 32px 40px 0;
        }

        .stats-eyebrow {
          margin: 0 0 4px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: #94a3b8;
        }

        .stats-title {
          margin: 0;
          color: #1a2340;
          font: 400 30px 'DM Serif Display', Georgia, serif;
        }

        .stats-subtitle {
          margin: 8px 0 0;
          max-width: 650px;
          color: #64748b;
          font-size: 14px;
          line-height: 1.6;
        }

        .stats-content {
          padding: 28px 40px 48px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .stats-loading,
        .stats-error {
          padding: 16px 18px;
          border-radius: 10px;
          font-size: 13px;
        }

        .stats-loading {
          background: #fff;
          border: 1px solid #e2e8f0;
          color: #64748b;
        }

        .stats-error,
        .stats-inline-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
        }

        .stats-error {
          padding: 16px 18px;
          border-radius: 10px;
          font-size: 13px;
        }

        .stats-inline-error {
          margin: 0 22px 18px;
          padding: 10px 12px;
          border-radius: 7px;
          font-size: 12px;
        }

        .stats-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .stats-summary-card,
        .stats-panel,
        .stats-detail-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
        }

        .stats-summary-card {
          padding: 20px;
        }

        .stats-summary-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .stats-summary-label {
          font-size: 13px;
          font-weight: 500;
          color: #64748b;
        }

        .stats-summary-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #f1f5f9;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stats-summary-value {
          margin-top: 18px;
          color: #1a2340;
          font: 400 34px/1 'DM Serif Display', Georgia, serif;
        }

        .stats-panel {
          overflow: hidden;
        }

        .stats-panel-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 22px;
          border-bottom: 1px solid #eef2f7;
        }

        .stats-panel-heading h2,
        .stats-detail-card h2 {
          margin: 0;
          color: #1a2340;
          font: 400 20px 'DM Serif Display', Georgia, serif;
        }

        .stats-panel-heading span {
          display: block;
          margin-top: 4px;
          font-size: 12px;
          color: #94a3b8;
        }

        .stats-empty {
          min-height: 240px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 30px;
        }

        .stats-empty-icon {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: #f1f5f9;
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
        }

        .stats-empty h3 {
          margin: 0;
          color: #334155;
          font: 500 16px Inter, system-ui, sans-serif;
        }

        .stats-empty p {
          margin: 7px 0 0;
          color: #94a3b8;
          font-size: 13px;
        }

        .activity-list {
          padding: 6px 22px 14px;
        }

        .activity-row,
        .project-stat-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 0;
          border-bottom: 1px solid #f1f5f9;
        }

        .activity-row:last-child,
        .project-stat-row:last-child {
          border-bottom: 0;
        }

        .activity-row > div,
        .project-stat-row > div {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .activity-row strong,
        .project-stat-row strong {
          color: #334155;
          font-size: 13px;
          font-weight: 600;
        }

        .activity-row span,
        .project-stat-row span {
          color: #94a3b8;
          font-size: 11px;
        }

        .activity-duration {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 9px;
          border-radius: 6px;
          background: #f1f5f9;
          color: #64748b !important;
          white-space: nowrap;
        }

        .stats-controls {
          display: grid;
          grid-template-columns: 1.2fr 1.2fr 1fr auto;
          gap: 12px;
          padding: 20px 22px;
          align-items: end;
        }

        .stats-controls:has(
          #stats-compare-field
        ) {
          grid-template-columns:
            1fr
            1fr
            1fr
            1fr
            auto;
        }

        .stats-control {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .stats-control label {
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
        }

        .stats-control select {
          width: 100%;
          min-height: 38px;
          padding: 0 10px;
          border: 1px solid #cbd5e1;
          border-radius: 7px;
          background: #fff;
          color: #334155;
          font-size: 13px;
        }

        .stats-load-btn {
          min-height: 38px;
          padding: 0 14px;
          border: 0;
          border-radius: 7px;
          background: #4f63d2;
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .stats-load-btn:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .stats-selection-empty {
          padding: 20px 22px 24px;
          color: #94a3b8;
          font-size: 12px;
        }

        .statistics-result {
          padding: 0 22px 22px;
        }

        .statistics-summary {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
        }

        .statistics-summary-item {
          padding: 14px;
          border: 1px solid #eef2f7;
          border-radius: 8px;
          background: #f8fafc;
        }

        .statistics-summary-item span {
          display: block;
          color: #94a3b8;
          font-size: 11px;
        }

        .statistics-summary-item strong {
          display: block;
          margin-top: 6px;
          color: #334155;
          font-size: 16px;
        }

        .statistics-groups {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 4px;
        }

        .statistics-group-row {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding: 10px 12px;
          background: #f8fafc;
          border-radius: 7px;
          font-size: 12px;
          color: #475569;
        }

        .statistics-group-row strong {
          color: #334155;
        }

        .statistics-plot {
          margin-top: 4px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .statistics-plot-row {
          display: grid;
          grid-template-columns: minmax(120px, 1fr) 3fr 60px;
          align-items: center;
          gap: 10px;
          font-size: 12px;
        }

        .statistics-plot-label {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #475569;
        }

        .statistics-plot-track {
          height: 10px;
          border-radius: 999px;
          background: #e2e8f0;
          overflow: hidden;
        }

        .statistics-plot-bar {
          height: 100%;
          min-width: 2px;
          border-radius: 999px;
          background: #4f63d2;
        }

        .statistics-plot-value {
          text-align: right;
          color: #334155;
          font-weight: 600;
        }

        .statistics-compare {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .statistics-compare-card {
          padding: 16px;
          border: 1px solid #eef2f7;
          border-radius: 8px;
          background: #f8fafc;
        }

        .statistics-compare-card h3 {
          margin: 0 0 12px;
          color: #334155;
          font-size: 13px;
          font-weight: 600;
        }

        .statistics-compare-card p {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 12px;
        }

        .statistics-compare-card strong {
          color: #334155;
        }

        .stats-detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }

        .stats-detail-card {
          padding: 22px;
          min-height: 180px;
        }

        .stats-detail-card-top {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 12px;
        }

        .stats-detail-icon {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          background: #eef2ff;
          color: #4f63d2;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stats-detail-card p {
          margin: 18px 0 0;
          color: #94a3b8;
          font-size: 13px;
          line-height: 1.6;
        }

        .project-stats-list {
          margin-top: 4px;
        }

        .entry-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 18px;
        }

        .entry-summary div {
          padding: 14px;
          background: #f8fafc;
          border-radius: 8px;
        }

        .entry-summary span {
          display: block;
          color: #94a3b8;
          font-size: 11px;
        }

        .entry-summary strong {
          display: block;
          margin-top: 6px;
          color: #334155;
          font-size: 18px;
        }

        .stats-summary-card svg,
        .stats-detail-card svg,
        .activity-duration svg {
          width: 17px;
          height: 17px;
        }

        .stats-panel svg {
          width: 24px;
          height: 24px;
        }

        @media (max-width: 1100px) {
          .stats-controls,
          .stats-controls:has(
            #stats-compare-field
          ) {
            grid-template-columns: 1fr 1fr;
          }

          .stats-load-btn {
            width: fit-content;
          }

          .statistics-summary {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 900px) {
          .stats-header,
          .stats-content {
            padding-left: 24px;
            padding-right: 24px;
          }

          .stats-summary-grid,
          .stats-detail-grid {
            grid-template-columns: 1fr;
          }

          .statistics-summary {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .stats-header {
            padding-top: 24px;
          }

          .stats-title {
            font-size: 24px;
          }

          .stats-summary-grid,
          .stats-detail-grid,
          .statistics-summary,
          .statistics-compare,
          .entry-summary,
          .stats-controls,
          .stats-controls:has(
            #stats-compare-field
          ) {
            grid-template-columns: 1fr;
          }

          .stats-panel-heading {
            align-items: flex-start;
            gap: 8px;
            flex-direction: column;
          }

          .statistics-plot-row {
            grid-template-columns: 90px 1fr 45px;
          }
        }
      `}</style>
    </div>
  );
}

function StatisticsResult({
  statistics,
  operation,
}) {
  if (!statistics) {
    return null;
  }

  if (operation === "total") {
    return (
      <div className="statistics-result">
        <div className="statistics-summary">
          {statistics.count != null && (
            <StatisticsItem
              label="Count"
              value={statistics.count}
            />
          )}

          {statistics.sum != null && (
            <StatisticsItem
              label="Sum"
              value={formatNumber(
                statistics.sum,
              )}
            />
          )}

          {statistics.average != null && (
            <StatisticsItem
              label="Average"
              value={formatNumber(
                statistics.average,
              )}
            />
          )}

          {statistics.minimum != null && (
            <StatisticsItem
              label="Minimum"
              value={formatNumber(
                statistics.minimum,
              )}
            />
          )}

          {statistics.maximum != null && (
            <StatisticsItem
              label="Maximum"
              value={formatNumber(
                statistics.maximum,
              )}
            />
          )}
        </div>

        {!statistics.count &&
          statistics.count !== 0 && (
            <div className="stats-selection-empty">
              No statistics were returned.
            </div>
          )}
      </div>
    );
  }

  if (operation === "group") {
    const groups = Array.isArray(
      statistics.groups,
    )
      ? statistics.groups
      : [];

    if (groups.length === 0) {
      return (
        <div className="stats-selection-empty">
          No values are available to group
          for this field.
        </div>
      );
    }

    return (
      <div className="statistics-result">
        <div className="statistics-groups">
          {groups.map(
            (group, index) => (
              <div
                className="statistics-group-row"
                key={
                  String(
                    group.value ??
                      index,
                  )
                }
              >
                <span>
                  {group.value ??
                    "No value"}
                </span>

                <strong>
                  {group.count}
                </strong>
              </div>
            ),
          )}
        </div>
      </div>
    );
  }

  if (operation === "plot") {
    const plotData = Array.isArray(
      statistics.data,
    )
      ? statistics.data
      : [];

    if (plotData.length === 0) {
      return (
        <div className="stats-selection-empty">
          No values are available to plot
          for this field.
        </div>
      );
    }

    const maximum = Math.max(
      ...plotData.map((item) =>
        Number(item.value || 0),
      ),
      1,
    );

    return (
      <div className="statistics-result">
        <div className="statistics-plot">
          {plotData.map(
            (item, index) => {
              const value = Number(
                item.value || 0,
              );

              const width =
                (value / maximum) * 100;

              return (
                <div
                  className="statistics-plot-row"
                  key={`${item.label}-${index}`}
                >
                  <span className="statistics-plot-label">
                    {item.label ||
                      "No label"}
                  </span>

                  <div className="statistics-plot-track">
                    <div
                      className="statistics-plot-bar"
                      style={{
                        width: `${Math.max(
                          width,
                          value > 0
                            ? 2
                            : 0,
                        )}%`,
                      }}
                    />
                  </div>

                  <span className="statistics-plot-value">
                    {formatNumber(value)}
                  </span>
                </div>
              );
            },
          )}
        </div>
      </div>
    );
  }

  if (operation === "compare") {
    return (
      <div className="statistics-result">
        <div className="statistics-compare">
          <div className="statistics-compare-card">
            <h3>
              {statistics.fields?.[0]
                ?.name || "First field"}
            </h3>

            <p>
              Total:{" "}
              <strong>
                {formatNumber(
                  statistics.first?.total ??
                    0,
                )}
              </strong>
            </p>

            <p>
              Average:{" "}
              <strong>
                {formatNumber(
                  statistics.first
                    ?.average ?? 0,
                )}
              </strong>
            </p>
          </div>

          <div className="statistics-compare-card">
            <h3>
              {statistics.fields?.[1]
                ?.name || "Second field"}
            </h3>

            <p>
              Total:{" "}
              <strong>
                {formatNumber(
                  statistics.second
                    ?.total ?? 0,
                )}
              </strong>
            </p>

            <p>
              Average:{" "}
              <strong>
                {formatNumber(
                  statistics.second
                    ?.average ?? 0,
                )}
              </strong>
            </p>
          </div>
        </div>

        <div className="statistics-summary">
          <StatisticsItem
            label="Entries compared"
            value={
              statistics.entriesCompared ??
              0
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="stats-selection-empty">
      No statistics were returned for this
      selection.
    </div>
  );
}

function StatisticsItem({
  label,
  value,
}) {
  return (
    <div className="statistics-summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatNumber(value) {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return String(value);
  }

  return number.toLocaleString(
    undefined,
    {
      maximumFractionDigits: 2,
    },
  );
}

function SummaryCard({
  label,
  value,
  icon,
}) {
  return (
    <div className="stats-summary-card">
      <div className="stats-summary-top">
        <span className="stats-summary-label">
          {label}
        </span>

        <span className="stats-summary-icon">
          {icon}
        </span>
      </div>

      <div className="stats-summary-value">
        {value}
      </div>
    </div>
  );
}

function IconClock() {
  return (
    <svg
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
    </svg>
  );
}

function IconChart() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line
        x1="4"
        y1="19"
        x2="20"
        y2="19"
      />

      <line
        x1="6"
        y1="16"
        x2="6"
        y2="10"
      />

      <line
        x1="11"
        y1="16"
        x2="11"
        y2="5"
      />

      <line
        x1="16"
        y1="16"
        x2="16"
        y2="8"
      />
    </svg>
  );
}
