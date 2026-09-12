import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import Sidebar from "../../components/Sidebar";
import EditProjectModal from "../../components/EditProjectModal";
import NewEntryModal from "./NewEntryModal";
import EditEntryModal from "./EditEntryModal";
import CalendarView from "./CalendarView";
import BoardView from "./BoardView";

import {
  createProjectEntry,
  fetchProjectDetails,
} from "../../api/projectDetailsApi";

import {
  fetchProjects,
  setProjectArchived,
  updateProject,
} from "../../api/projectsApi";

import {
  updateChecklistItem,
  deleteChecklistItem,
  updateProjectReferences,
  updateEntryProjectReferences,
  updateEntryReferences,
  updateEntry,
} from "../../api/entryFeaturesApi";

export default function ProjectDetails() {
  const { id } = useParams();

  const navigate = useNavigate();

  const [collapsed, setSidebarCollapsed] =
    useState(false);

  const [details, setDetails] = useState(null);

  const [projects, setProjects] = useState([]);

  const [checklistSaving, setChecklistSaving] = useState({});
  const [checklistEditing, setChecklistEditing] = useState({});
  const [checklistDrafts, setChecklistDrafts] = useState({});

  const [projectReferenceSaving, setProjectReferenceSaving] =
    useState(false);

  const [entryReferenceSaving, setEntryReferenceSaving] =
    useState({});

  const [showProjectReferenceModal, setShowProjectReferenceModal] =
    useState(false);

  const [showEntryReferenceModal, setShowEntryReferenceModal] =
    useState(false);

  const [selectedEntryForReferences, setSelectedEntryForReferences] =
    useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [showEntryModal, setShowEntryModal] =
    useState(false);

  const [showEditEntryModal, setShowEditEntryModal] =
    useState(false);

  const [selectedEntryForEdit, setSelectedEntryForEdit] =
    useState(null);

  const [entryView, setEntryView] =
    useState("list");

  const [projectActionSaving, setProjectActionSaving] =
    useState(false);

  const [
    showEditProjectModal,
    setShowEditProjectModal,
  ] = useState(false);

  const loadProject = useCallback(async () => {
    if (!id) {
      setError("No project ID was provided.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await fetchProjectDetails(id);
      setDetails(data);

      try {
        const allProjects = await fetchProjects("all");
        setProjects(Array.isArray(allProjects) ? allProjects : []);
      } catch (projectsError) {
        console.error("Failed to load projects for references:", projectsError);
        setProjects([]);
      }
    } catch (requestError) {
      console.error(
        "Failed to load project:",
        requestError,
      );

      setError(
        requestError.message ||
          "Failed to load project.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  useEffect(() => {
    if (!details || !window.location.hash) return;
    const targetId = window.location.hash.slice(1);
    const timer = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [details]);

  function openEditEntryModal(entry) {
    setSelectedEntryForEdit(entry);
    setShowEditEntryModal(true);
  }

  async function handleUpdateEntry(entryId, payload) {
    try {
      await updateEntry(id, entryId, payload);
      await updateEntryProjectReferences(id, entryId, payload.referenceProjectIds || []);
      await updateEntryReferences(id, entryId, payload.referenceEntryIds || []);
      setShowEditEntryModal(false);
      setSelectedEntryForEdit(null);
      await loadProject();
    } catch (requestError) {
      console.error("Failed to update entry:", requestError);
      throw requestError;
    }
  }

  async function handleCreateEntry(payload) {
    try {
      await createProjectEntry(id, payload);

      setShowEntryModal(false);

      /*
       * Reload the complete project after creation.
       *
       * This refreshes:
       * - entries
       * - total entries
       * - logged time
       * - last activity
       * - project fields
       *
       * It also means fields added while creating
       * the entry immediately become project fields.
       */
      await loadProject();
    } catch (requestError) {
      console.error(
        "Failed to create entry:",
        requestError,
      );

      throw requestError;
    }
  }

  async function handleChecklistToggle(entryId, itemId, completed) {
    const key = `${entryId}:${itemId}`;

    try {
      setChecklistSaving((current) => ({ ...current, [key]: true }));
      await updateChecklistItem(id, entryId, itemId, completed);
      setDetails((current) => {
        if (!current) return current;
        return {
          ...current,
          entries: current.entries.map((entry) =>
            entry.id !== entryId
              ? entry
              : {
                  ...entry,
                  checklist: (entry.checklist || []).map((item) =>
                    item.id === itemId ? { ...item, completed } : item,
                  ),
                },
          ),
        };
      });
    } catch (requestError) {
      setError(requestError.message || "Failed to update checklist item.");
    } finally {
      setChecklistSaving((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  }

  function startChecklistEdit(entryId, item) {
    const key = `${entryId}:${item.id}`;
    setChecklistEditing((current) => ({ ...current, [key]: true }));
    setChecklistDrafts((current) => ({ ...current, [key]: item.text }));
  }

  function cancelChecklistEdit(entryId, itemId) {
    const key = `${entryId}:${itemId}`;
    setChecklistEditing((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setChecklistDrafts((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function saveChecklistText(entryId, itemId) {
    const key = `${entryId}:${itemId}`;
    const text = (checklistDrafts[key] || "").trim();
    if (!text) {
      setError("Checklist item text cannot be empty.");
      return;
    }

    try {
      setChecklistSaving((current) => ({ ...current, [key]: true }));
      setError("");
      const updated = await updateChecklistItem(id, entryId, itemId, { text });
      setDetails((current) => current ? ({
        ...current,
        entries: current.entries.map((entry) => entry.id !== entryId ? entry : {
          ...entry,
          checklist: (entry.checklist || []).map((item) => item.id === itemId ? { ...item, text: updated.text } : item),
        }),
      }) : current);
      cancelChecklistEdit(entryId, itemId);
    } catch (requestError) {
      setError(requestError.message || "Failed to update checklist item.");
    } finally {
      setChecklistSaving((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  }

  async function handleDeleteChecklistItem(entryId, itemId) {
    const key = `${entryId}:${itemId}`;
    if (!window.confirm("Remove this checklist item?")) return;

    try {
      setChecklistSaving((current) => ({ ...current, [key]: true }));
      setError("");
      await deleteChecklistItem(id, entryId, itemId);
      setDetails((current) => current ? ({
        ...current,
        entries: current.entries.map((entry) => entry.id !== entryId ? entry : {
          ...entry,
          checklist: (entry.checklist || []).filter((item) => item.id !== itemId),
        }),
      }) : current);
    } catch (requestError) {
      setError(requestError.message || "Failed to remove checklist item.");
    } finally {
      setChecklistSaving((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  }

  async function handleUpdateProjectReferences(referencedProjectIds) {
    try {
      setProjectReferenceSaving(true);
      setError("");

      await updateProjectReferences(id, referencedProjectIds);

      setShowProjectReferenceModal(false);
      await loadProject();
    } catch (requestError) {
      console.error(
        "Failed to update project references:",
        requestError,
      );

      setError(
        requestError.message ||
          "Failed to update project references.",
      );
    } finally {
      setProjectReferenceSaving(false);
    }
  }

  async function handleUpdateEntryReferences(
    entryId,
    referencedEntryIds,
  ) {
    const key = `references:${entryId}`;

    try {
      setEntryReferenceSaving((current) => ({
        ...current,
        [key]: true,
      }));

      setError("");

      await updateEntryReferences(
        id,
        entryId,
        referencedEntryIds,
      );

      setShowEntryReferenceModal(false);
      setSelectedEntryForReferences(null);
      await loadProject();
    } catch (requestError) {
      console.error(
        "Failed to update entry references:",
        requestError,
      );

      setError(
        requestError.message ||
          "Failed to update entry references.",
      );
    } finally {
      setEntryReferenceSaving((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  }

  function openEntryReferenceModal(entry) {
    setSelectedEntryForReferences(entry);
    setShowEntryReferenceModal(true);
  }

  async function handleUpdateProject(payload) {
    try {
      await updateProject(id, payload);

      setShowEditProjectModal(false);
      await loadProject();
    } catch (requestError) {
      console.error(
        "Failed to update project:",
        requestError,
      );

      throw requestError;
    }
  }

  async function handleToggleArchive() {
    const project = details?.project || {};
    const shouldArchive = !project.archivedAt;

    try {
      setProjectActionSaving(true);
      setError("");

      await setProjectArchived(id, shouldArchive);

      navigate(
        shouldArchive
          ? "/projects?tab=archived"
          : "/projects",
      );
    } catch (requestError) {
      console.error(
        "Failed to change archive status:",
        requestError,
      );

      setError(
        requestError.message ||
          "Failed to update project archive status.",
      );
    } finally {
      setProjectActionSaving(false);
    }
  }

  function formatDate(value) {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return new Intl.DateTimeFormat("en-ZA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  function formatLoggedTime(minutes = 0) {
    const safeMinutes = Number(minutes) || 0;

    if (safeMinutes === 0) {
      return "0 hrs";
    }

    const hours = Math.floor(safeMinutes / 60);
    const remainingMinutes = safeMinutes % 60;

    if (hours === 0) {
      return `${remainingMinutes} min`;
    }

    if (remainingMinutes === 0) {
      return `${hours} hrs`;
    }

    return `${hours}h ${remainingMinutes}m`;
  }

  if (loading) {
    return (
      <div className="app-shell">
        <Sidebar
          collapsed={collapsed}
          onToggle={() =>
            setSidebarCollapsed(
              (current) => !current,
            )
          }
        />

        <main className="app-main">
          <div className="project-status">
            <IconEntryLarge />

            <p>Loading project...</p>
          </div>
        </main>

        <ProjectDetailsStyles />
      </div>
    );
  }

  if (error && !details) {
    return (
      <div className="app-shell">
        <Sidebar
          collapsed={collapsed}
          onToggle={() =>
            setSidebarCollapsed(
              (current) => !current,
            )
          }
        />

        <main className="app-main">
          <div className="project-status">
            <IconEntryLarge />

            <h2>Unable to load project</h2>

            <p>{error}</p>

            <button
              type="button"
              className="btn btn-primary"
              onClick={loadProject}
            >
              Try Again
            </button>

            <button
              type="button"
              className="breadcrumb-link"
              onClick={() => navigate("/projects")}
            >
              Back to Projects
            </button>
          </div>
        </main>

        <ProjectDetailsStyles />
      </div>
    );
  }

  if (!details) {
    return null;
  }

  const project = details.project || {};

  const stats = details.stats || {
    totalEntries: 0,
    loggedMinutes: 0,
    lastActivity: null,
  };

  const fields = Array.isArray(details.fields)
    ? details.fields
    : [];

  const entries = Array.isArray(details.entries)
    ? details.entries
    : [];

  const usedFieldIds = new Set(
    entries.flatMap((entry) =>
      (Array.isArray(entry.values) ? entry.values : [])
        .map((value) => value.fieldId)
        .filter(Boolean),
    ),
  );

  const editableProject = {
    name: project.name || "",
    description: project.description || "",
    fields: fields.map((field) => ({
      id: field.id,
      label: field.name,
      type: field.fieldType,
      usedByEntries: usedFieldIds.has(field.id),
    })),
  };

  return (
    <div className="app-shell">
      <Sidebar
        collapsed={collapsed}
        onToggle={() =>
          setSidebarCollapsed(
            (current) => !current,
          )
        }
      />

      <main className="app-main">
        {/* Breadcrumb */}
        <div className="breadcrumb-bar">
          <button
            type="button"
            className="breadcrumb-link"
            onClick={() => navigate("/projects")}
          >
            Projects
          </button>

          <span className="breadcrumb-sep">
            <IconChevronRight />
          </span>

          <span className="breadcrumb-current">
            Project Details
          </span>
        </div>

        {/* Page header */}
        <header className="page-header">
          <div className="page-header-left">
            <p className="page-header-eyebrow">
              Project
            </p>

            <h1 className="page-header-title">
              {project.name ||
                project.title ||
                "Untitled Project"}
            </h1>

            {project.description && (
              <p className="page-header-description">
                {project.description}
              </p>
            )}
          </div>

          <div className="page-header-actions">
            {/*
             * Archive belongs to project management.
             *
             * Keep the button and styling here.
             * Do not implement their backend operation
             * inside Project Details.
             */}
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleToggleArchive}
              disabled={projectActionSaving}
            >
              <IconArchive />
              {project.archivedAt ? "Restore" : "Archive"}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                setShowEditProjectModal(true)
              }
              disabled={projectActionSaving}
            >
              <IconEdit />
              Edit Project
            </button>

            {!project.archivedAt && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  setShowEntryModal(true)
                }
                disabled={projectActionSaving}
              >
                <IconPlus />
                Add New Entry
              </button>
            )}
          </div>
        </header>

        <div className="project-content">
          {error && (
            <div className="project-inline-error">
              {error}
            </div>
          )}

          {/* Statistics */}
          <div className="project-stat-strip">
            <ProjectStat
              label="Total Entries"
              value={
                stats.totalEntries ??
                entries.length
              }
              icon={<IconEntry />}
            />

            <div className="stat-divider" />

            <ProjectStat
              label="Logged Time"
              value={formatLoggedTime(
                stats.loggedMinutes,
              )}
              icon={<IconClock />}
            />

            <div className="stat-divider" />

            <ProjectStat
              label="Last Activity"
              value={formatDate(
                stats.lastActivity,
              )}
              icon={<IconCalendar />}
            />

            <div className="stat-divider" />

            <ProjectStat
              label="Created"
              value={formatDate(
                project.createdAt,
              )}
              icon={<IconInfo />}
            />
          </div>

          {/* Project references */}
          <section className="references-section">
            <div className="references-section-header">
              <div>
                <h2 className="entries-title">Project references</h2>
                <p className="references-description">
                  Projects related to this project.
                </p>
              </div>

              {!project.archivedAt && (
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => setShowProjectReferenceModal(true)}
                  disabled={projectReferenceSaving}
                >
                  <IconLink />
                  Manage references
                </button>
              )}
            </div>

            {Array.isArray(details.references) && details.references.length > 0 ? (
              <div className="entry-reference-list project-reference-list">
                {details.references.map((reference) => (
                  <button
                    type="button"
                    className="entry-reference-link"
                    key={reference.id}
                    onClick={() => navigate(`/projects/${reference.referencedProjectId}`)}
                  >
                    {reference.referencedProjectName}
                  </button>
                ))}
              </div>
            ) : (
              <p className="references-empty">No project references.</p>
            )}
          </section>

          {/* Entries */}
          <section className="entries-section">
            <div className="entries-header entries-header-with-views">
              <div>
                <h2 className="entries-title">Entries</h2>
                <span className="entries-count">
                  {entries.length} {entries.length === 1 ? "entry" : "entries"}
                </span>
              </div>

              {entries.length > 0 && (
                <div className="entry-view-switcher" aria-label="Entry view">
                  {[
                    ["list", "List"],
                    ["calendar", "Calendar"],
                    ["board", "Board"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`view-btn ${entryView === value ? "view-btn-active" : ""}`}
                      onClick={() => setEntryView(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {entries.length === 0 ? (
              <div className="entries-empty">
                <div className="empty-icon-wrap"><IconEntryLarge /></div>
                <p className="empty-heading">No entries yet.</p>
                <p className="empty-body">
                  Add your first entry to start building a record for this project. Each entry captures a piece of your work.
                </p>
                {!project.archivedAt && (
                  <button type="button" className="btn btn-primary" onClick={() => setShowEntryModal(true)}>
                    <IconPlus /> Add New Entry
                  </button>
                )}
              </div>
            ) : entryView === "calendar" ? (
              <CalendarView entries={entries} formatLoggedTime={formatLoggedTime} />
            ) : entryView === "board" ? (
              <BoardView entries={entries} fields={fields} formatLoggedTime={formatLoggedTime} />
            ) : (
              <div className="entries-list">
                {entries.map((entry) => {
                  const values = Array.isArray(entry.values) ? entry.values : [];
                  const linkedEntries = Array.isArray(entry.linkedEntries) ? entry.linkedEntries : [];

                  return (
                    <article
                      className="entry-row"
                      id={`entry-${entry.id}`}
                      key={entry.id}
                    >
                      <div className="entry-row-header">
                        <div>
                          <h3 className="entry-row-title">{entry.name || "Logbook Entry"}</h3>
                          <p className="entry-row-date">{formatDate(entry.occurredAt || entry.createdAt)}</p>
                        </div>
                        <span className="entry-duration"><IconClockSmall />{formatLoggedTime(entry.durationMinutes)}</span>
                      </div>

                      {linkedEntries.length > 0 && (
                        <div className="entry-links">
                          <span className="entry-links-label">Linked entries:</span>
                          {linkedEntries.map((linked) => (
                            <span className="entry-link-chip" key={linked.id}>{linked.name}</span>
                          ))}
                        </div>
                      )}

                      {values.length > 0 && (
                        <div className="entry-values">
                          {values.map((field, index) => (
                            <div className="entry-value" key={field.fieldId || field.id || index}>
                              <span className="entry-value-name">{field.name || "Field"}</span>
                              <span className="entry-value-content"><FormattedFieldValue field={field} /></span>
                            </div>
                          ))}
                        </div>
                      )}

                      {Array.isArray(entry.checklist) && entry.checklist.length > 0 && (
                        <div className="entry-feature-block">
                          <div className="entry-feature-heading">
                            <CheckSquare size={15} />
                            Checklist
                          </div>
                          <div className="entry-checklist">
                            {entry.checklist.map((item) => {
                              const key = `${entry.id}:${item.id}`;
                              const isEditing = Boolean(checklistEditing[key]);
                              const isSaving = Boolean(checklistSaving[key]);
                              return (
                                <div className={`entry-checklist-row ${item.completed ? "entry-checklist-item--done" : ""}`} key={item.id}>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(item.completed)}
                                    disabled={isSaving || isEditing || Boolean(project.archivedAt)}
                                    onChange={(event) => handleChecklistToggle(entry.id, item.id, event.target.checked)}
                                  />
                                  {isEditing ? (
                                    <input
                                      className="entry-checklist-edit-input"
                                      type="text"
                                      maxLength={300}
                                      value={checklistDrafts[key] ?? item.text}
                                      onChange={(event) => setChecklistDrafts((current) => ({ ...current, [key]: event.target.value }))}
                                      disabled={isSaving}
                                    />
                                  ) : (
                                    <span>{item.text}</span>
                                  )}
                                  {!project.archivedAt && (
                                    <div className="entry-checklist-actions">
                                      {isEditing ? (
                                        <>
                                          <button type="button" className="entry-checklist-action" onClick={() => saveChecklistText(entry.id, item.id)} disabled={isSaving}>Save</button>
                                          <button type="button" className="entry-checklist-action" onClick={() => cancelChecklistEdit(entry.id, item.id)} disabled={isSaving}>Cancel</button>
                                        </>
                                      ) : (
                                        <button type="button" className="entry-checklist-action" onClick={() => startChecklistEdit(entry.id, item)} disabled={isSaving}>Edit</button>
                                      )}
                                      <button type="button" className="entry-checklist-action entry-checklist-delete" onClick={() => handleDeleteChecklistItem(entry.id, item.id)} disabled={isSaving || isEditing}>Remove</button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {Array.isArray(entry.references) && entry.references.length > 0 && (
                        <div className="entry-feature-block">
                          <div className="entry-feature-heading">
                            <IconLink />
                            Referenced projects
                          </div>
                          <div className="entry-reference-list">
                            {entry.references.map((reference) => (
                              <button
                                type="button"
                                className="entry-reference-link"
                                key={reference.id}
                                onClick={() => navigate(`/projects/${reference.projectId}`)}
                              >
                                {reference.projectName}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {Array.isArray(entry.entryReferences) && entry.entryReferences.length > 0 && (
                        <div className="entry-feature-block">
                          <div className="entry-feature-heading">
                            <IconLink />
                            Referenced entries
                          </div>
                          <div className="entry-reference-list">
                            {entry.entryReferences.map((reference) => (
                              <button
                                type="button"
                                className="entry-reference-link"
                                key={reference.id}
                                onClick={() => {
                                  const target = document.getElementById(
                                    `entry-${reference.referencedEntryId}`,
                                  );
                                  target?.scrollIntoView({
                                    behavior: "smooth",
                                    block: "center",
                                  });
                                }}
                              >
                                {reference.referencedEntryName}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="entry-action-row">
                        {!project.archivedAt && (
                          <button
                            type="button"
                            className="entry-edit-button"
                            onClick={() => openEditEntryModal(entry)}
                          >
                            <IconEdit />
                            Edit entry
                          </button>
                        )}
                      </div>

                      <div className="entry-reference-manage">
                        <button
                          type="button"
                          className="entry-reference-manage-button"
                          onClick={() => openEntryReferenceModal(entry)}
                          disabled={Boolean(
                            entryReferenceSaving[`references:${entry.id}`],
                          )}
                        >
                          <IconLink />
                          Manage entry references
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {showEditEntryModal && selectedEntryForEdit && !project.archivedAt && (
        <EditEntryModal
          entry={selectedEntryForEdit}
          fields={fields}
          projects={projects}
          entries={entries}
          onClose={() => {
            setShowEditEntryModal(false);
            setSelectedEntryForEdit(null);
          }}
          onSave={(payload) =>
            handleUpdateEntry(selectedEntryForEdit.id, payload)
          }
        />
      )}

      {/* Your responsibility: create entries */}
      {showEntryModal && !project.archivedAt && (
        <NewEntryModal
          fields={fields}
          projects={projects}
          entries={entries}
          currentProjectId={project.id}
          onClose={() =>
            setShowEntryModal(false)
          }
          onCreate={handleCreateEntry}
        />
      )}

      {showProjectReferenceModal && (
        <ReferenceSelectionModal
          title="Project references"
          description="Select the projects that this project should reference."
          options={projects.filter((candidate) => candidate.id !== project.id)}
          selectedIds={
            Array.isArray(details.references)
              ? details.references.map(
                  (reference) => reference.referencedProjectId,
                )
              : []
          }
          getOptionId={(option) => option.id}
          getOptionLabel={(option) => option.name || "Untitled Project"}
          onClose={() => setShowProjectReferenceModal(false)}
          onSave={handleUpdateProjectReferences}
          saving={projectReferenceSaving}
        />
      )}

      {showEntryReferenceModal && selectedEntryForReferences && (
        <ReferenceSelectionModal
          title="Entry references"
          description="Select the entries that this entry should reference."
          options={entries.filter(
            (candidate) => candidate.id !== selectedEntryForReferences.id,
          )}
          selectedIds={
            Array.isArray(selectedEntryForReferences.entryReferences)
              ? selectedEntryForReferences.entryReferences.map(
                  (reference) => reference.referencedEntryId,
                )
              : []
          }
          getOptionId={(option) => option.id}
          getOptionLabel={(option) => option.name || "Logbook Entry"}
          onClose={() => {
            setShowEntryReferenceModal(false);
            setSelectedEntryForReferences(null);
          }}
          onSave={(referencedEntryIds) =>
            handleUpdateEntryReferences(
              selectedEntryForReferences.id,
              referencedEntryIds,
            )
          }
          saving={Boolean(
            entryReferenceSaving[
              `references:${selectedEntryForReferences.id}`
            ],
          )}
        />
      )}

      {/* Teammate responsibility: project editing */}
      {showEditProjectModal && (
        <EditProjectModal
          project={editableProject}
          onClose={() =>
            setShowEditProjectModal(false)
          }
          onSave={handleUpdateProject}
        />
      )}

      <ProjectDetailsStyles />
    </div>
  );
}

function ReferenceSelectionModal({
  title,
  description,
  options,
  selectedIds,
  getOptionId,
  getOptionLabel,
  onClose,
  onSave,
  saving = false,
}) {
  const [selected, setSelected] = useState(
    Array.isArray(selectedIds) ? selectedIds : [],
  );

  function toggle(id) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((currentId) => currentId !== id)
        : [...current, id],
    );
  }

  return (
    <div
      className="modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <div
        className="modal reference-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reference-modal-title"
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title" id="reference-modal-title">
              {title}
            </h2>
            {description && (
              <p className="reference-modal-description">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
            disabled={saving}
          >
            <IconXSmall />
          </button>
        </div>

        <div className="modal-body">
          {options.length === 0 ? (
            <div className="references-empty-modal">
              No other items are available to reference.
            </div>
          ) : (
            <div className="reference-selection-list">
              {options.map((option) => {
                const optionId = getOptionId(option);
                const checked = selected.includes(optionId);

                return (
                  <label
                    className={`reference-selection-option${
                      checked ? " reference-selection-option--selected" : ""
                    }`}
                    key={optionId}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(optionId)}
                      disabled={saving}
                    />
                    <span>{getOptionLabel(option)}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn-cancel"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn-save"
            onClick={() => onSave(selected)}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save references"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormattedFieldValue({ field }) {
  const value = field.value;

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  if (field.type === "date") {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
    }
  }

  return String(value);
}

/* =========================================================
 * SUB COMPONENTS
 * ======================================================= */

function ProjectStat({
  label,
  value,
  icon,
}) {
  return (
    <div className="project-stat">
      <div className="project-stat-icon">
        {icon}
      </div>

      <div className="project-stat-text">
        <span className="project-stat-label">
          {label}
        </span>

        <span className="project-stat-value">
          {value}
        </span>
      </div>
    </div>
  );
}

/* =========================================================
 * STYLES
 * ======================================================= */

function ProjectDetailsStyles() {
  return (
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

      /* Breadcrumb */

      .breadcrumb-bar {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 24px 40px 0;
        font-size: 13px;
        color: #94a3b8;
      }

      .breadcrumb-link {
        background: none;
        border: none;
        cursor: pointer;
        font-family: 'Inter', sans-serif;
        font-size: 13px;
        color: #64748b;
        padding: 0;
        font-weight: 500;
        transition: color 0.15s ease;
      }

      .breadcrumb-link:hover {
        color: #4f63d2;
      }

      .breadcrumb-sep {
        display: flex;
        align-items: center;
        color: #cbd5e1;
      }

      .breadcrumb-current {
        color: #94a3b8;
        font-weight: 400;
      }

      /* Page header */

      .page-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: 20px 40px 0;
        gap: 16px;
        flex-wrap: wrap;
      }

      .page-header-left {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .page-header-eyebrow {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #94a3b8;
        margin: 0;
      }

      .page-header-title {
        font-family:
          'DM Serif Display',
          Georgia,
          serif;
        font-size: 30px;
        font-weight: 400;
        color: #1a2340;
        margin: 0;
      }

      .page-header-description {
        font-family: 'Inter', sans-serif;
        font-size: 13px;
        color: #64748b;
        line-height: 1.55;
        margin: 4px 0 0;
        max-width: 620px;
      }

      .page-header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        padding-top: 8px;
      }

      /* Buttons */

      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        padding: 9px 16px;
        border-radius: 8px;
        font-family: 'Inter', sans-serif;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        border: none;
        transition:
          background 0.15s ease,
          box-shadow 0.15s ease,
          color 0.15s ease;
        white-space: nowrap;
      }

      .btn-primary {
        background: #4f63d2;
        color: #ffffff;
      }

      .btn-primary:hover {
        background: #3d50bf;
        box-shadow:
          0 2px 10px
          rgba(79, 99, 210, 0.3);
      }

      .btn-secondary {
        background: #ffffff;
        color: #1e293b;
        border: 1.5px solid #e2e8f0;
      }

      .btn-secondary:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
      }

      .btn-ghost {
        background: transparent;
        color: #64748b;
        border: 1.5px solid transparent;
      }

      .btn-ghost:hover {
        background: #f1f5f9;
        color: #1e293b;
      }

      .btn:focus-visible {
        outline: 2px solid #4f63d2;
        outline-offset: 2px;
      }

      .btn:disabled {
        cursor: not-allowed;
        opacity: 0.65;
      }

      /* Content */

      .project-content {
        padding: 24px 40px 40px;
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      /* Stats */

      .project-stat-strip {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        display: flex;
        align-items: stretch;
        overflow: hidden;
      }

      .project-stat {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 20px 24px;
      }

      .project-stat-icon {
        width: 36px;
        height: 36px;
        border-radius: 9px;
        background: #f1f5f9;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #64748b;
        flex-shrink: 0;
      }

      .project-stat-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .project-stat-label {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #94a3b8;
      }

      .project-stat-value {
        font-family:
          'DM Serif Display',
          Georgia,
          serif;
        font-size: 22px;
        font-weight: 400;
        color: #1a2340;
        line-height: 1.1;
      }

      .stat-divider {
        width: 1px;
        background: #f1f5f9;
        margin: 12px 0;
      }

      /* Entries */

      .entries-section {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        overflow: hidden;
      }

      .entries-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 18px 24px;
        border-bottom: 1px solid #f1f5f9;
      }

      .entries-title {
        font-family: 'Inter', sans-serif;
        font-size: 14px;
        font-weight: 600;
        color: #1a2340;
        margin: 0;
      }

      .entries-count {
        font-size: 12px;
        font-weight: 500;
        color: #94a3b8;
      }

      .entries-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 64px 32px;
        gap: 10px;
      }

      .empty-icon-wrap {
        width: 56px;
        height: 56px;
        border-radius: 14px;
        background: #f1f5f9;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #94a3b8;
        margin-bottom: 4px;
      }

      .empty-heading {
        font-size: 15px;
        font-weight: 600;
        color: #1a2340;
        margin: 0;
      }

      .empty-body {
        font-size: 13px;
        color: #94a3b8;
        margin: 0 0 6px;
        max-width: 360px;
        line-height: 1.6;
      }

      .entries-list {
        display: flex;
        flex-direction: column;
      }

      .entry-row {
        padding: 20px 24px;
        border-bottom: 1px solid #f1f5f9;
        transition: background 0.15s ease;
      }

      .entry-row:last-child {
        border-bottom: none;
      }

      .entry-row:hover {
        background: #fbfcfe;
      }

      .entry-row-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
      }

      .entry-row-title {
        font-family: 'Inter', sans-serif;
        font-size: 14px;
        font-weight: 600;
        color: #1a2340;
        margin: 0;
      }

      .entry-row-date {
        font-family: 'Inter', sans-serif;
        font-size: 12px;
        color: #94a3b8;
        margin: 4px 0 0;
      }

      .entry-duration {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 5px 9px;
        border-radius: 6px;
        background: #f1f5f9;
        color: #64748b;
        font-family: 'Inter', sans-serif;
        font-size: 12px;
        font-weight: 500;
        white-space: nowrap;
      }

      .entry-values {
        display: grid;
        grid-template-columns:
          repeat(
            auto-fit,
            minmax(190px, 1fr)
          );
        gap: 12px;
        margin-top: 16px;
      }

      .entry-value {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 11px 12px;
        background: #f8fafc;
        border: 1px solid #f1f5f9;
        border-radius: 8px;
      }

      .entry-value-name {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        font-weight: 600;
        color: #94a3b8;
      }

      .entry-value-content {
        font-size: 13px;
        line-height: 1.5;
        color: #334155;
        overflow-wrap: anywhere;
      }

      /* Status / errors */

      .project-inline-error {
        padding: 11px 14px;
        border: 1px solid #fecaca;
        border-radius: 8px;
        background: #fef2f2;
        color: #b91c1c;
        font-family: 'Inter', sans-serif;
        font-size: 13px;
      }

      .project-status {
        flex: 1;
        min-height: 420px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 40px;
        text-align: center;
        color: #64748b;
      }

      .project-status h2 {
        font-family:
          'DM Serif Display',
          Georgia,
          serif;
        font-size: 22px;
        font-weight: 400;
        color: #1a2340;
        margin: 0;
      }

      .project-status p {
        margin: 0;
        font-size: 13px;
      }

      /* Modal */

      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 200;
        padding: 24px;
        backdrop-filter: blur(2px);
      }

      .modal {
        background: #ffffff;
        border-radius: 16px;
        width: 100%;
        max-width: 560px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow:
          0 20px 60px rgba(0,0,0,0.18),
          0 4px 16px rgba(0,0,0,0.08);
        overflow: hidden;
      }

      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 22px 24px 18px;
        border-bottom: 1px solid #f1f5f9;
        flex-shrink: 0;
      }

      .modal-title {
        font-family:
          'DM Serif Display',
          Georgia,
          serif;
        font-size: 22px;
        font-weight: 400;
        color: #1a2340;
        margin: 0;
      }

      .modal-close {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        border: none;
        background: #f1f5f9;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: #64748b;
        transition:
          background 0.15s ease,
          color 0.15s ease;
        padding: 0;
      }

      .modal-close:hover {
        background: #e2e8f0;
        color: #1e293b;
      }

      .modal-form {
        min-height: 0;
        display: flex;
        flex: 1;
        flex-direction: column;
      }

      .modal-body {
        overflow-y: auto;
        flex: 1;
        padding: 20px 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      /* Form */

      .form-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .form-label {
        font-size: 13px;
        font-weight: 600;
        color: #374151;
      }

      .form-label-required::after {
        content: ' *';
        color: #ef4444;
      }

      .required {
        color: #ef4444;
      }

      .form-input {
        box-sizing: border-box;
        width: 100%;
        padding: 9px 12px;
        border: 1.5px solid #e2e8f0;
        border-radius: 8px;
        font-family: 'Inter', sans-serif;
        font-size: 14px;
        color: #1e293b;
        outline: none;
        transition:
          border-color 0.15s ease,
          box-shadow 0.15s ease;
        background: #ffffff;
      }

      textarea.form-input {
        resize: vertical;
        min-height: 90px;
      }

      .form-input:focus {
        border-color: #4f63d2;
        box-shadow:
          0 0 0 3px
          rgba(79,99,210,0.1);
      }

      .form-input::placeholder {
        color: #94a3b8;
      }

      .form-select {
        box-sizing: border-box;
        padding: 9px 12px;
        border: 1.5px solid #e2e8f0;
        border-radius: 8px;
        font-family: 'Inter', sans-serif;
        font-size: 14px;
        color: #1e293b;
        outline: none;
        background: #ffffff;
        cursor: pointer;
        width: 100%;
        transition:
          border-color 0.15s ease,
          box-shadow 0.15s ease;
      }

      .form-select:focus {
        border-color: #4f63d2;
        box-shadow:
          0 0 0 3px
          rgba(79,99,210,0.1);
      }

      .fields-block {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .fields-section-label {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: #94a3b8;
        margin: 0;
      }

      .fields-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .new-field-card {
        display: flex;
        flex-direction: column;
      }

      .field-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        background: #f8fafc;
        border: 1.5px solid #e2e8f0;
        border-radius: 8px;
      }

      .field-row-drag {
        color: #cbd5e1;
        display: flex;
        flex-shrink: 0;
      }

      .field-row-name {
        flex: 1;
        font-size: 13px;
        font-weight: 500;
        color: #1e293b;
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .field-row-type {
        font-size: 11px;
        font-weight: 500;
        color: #94a3b8;
        background: #e2e8f0;
        border-radius: 4px;
        padding: 2px 7px;
        flex-shrink: 0;
      }

      .field-row-remove {
        background: none;
        border: none;
        cursor: pointer;
        color: #cbd5e1;
        display: flex;
        align-items: center;
        padding: 2px;
        border-radius: 4px;
        transition:
          color 0.15s ease,
          background 0.15s ease;
        flex-shrink: 0;
      }

      .field-row-remove:hover {
        color: #ef4444;
        background:
          rgba(239,68,68,0.06);
      }

      .new-field-value {
        padding: 8px 0 4px;
      }

      .add-field-row {
        display: flex;
        gap: 8px;
        align-items: flex-end;
      }

      .add-field-name {
        flex: 1;
      }

      .add-field-type {
        width: 140px;
        flex-shrink: 0;
      }

      .btn-add-field {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 9px 14px;
        border: 1.5px dashed #cbd5e1;
        border-radius: 8px;
        background: transparent;
        font-family: 'Inter', sans-serif;
        font-size: 13px;
        font-weight: 500;
        color: #64748b;
        cursor: pointer;
        transition:
          border-color 0.15s ease,
          color 0.15s ease,
          background 0.15s ease;
        white-space: nowrap;
        flex-shrink: 0;
      }

      .btn-add-field:hover {
        border-color: #4f63d2;
        color: #4f63d2;
        background:
          rgba(79,99,210,0.04);
      }

      .form-error {
        padding: 10px 12px;
        margin: 0;
        border-radius: 8px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #b91c1c;
        font-size: 12px;
      }

      .modal-footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        padding: 16px 24px;
        border-top: 1px solid #f1f5f9;
        flex-shrink: 0;
      }

      .btn-cancel {
        padding: 9px 18px;
        border: 1.5px solid #e2e8f0;
        border-radius: 8px;
        background: #ffffff;
        font-family: 'Inter', sans-serif;
        font-size: 14px;
        font-weight: 500;
        color: #64748b;
        cursor: pointer;
        transition: background 0.15s ease;
      }

      .btn-cancel:hover {
        background: #f8fafc;
      }

      .btn-save {
        padding: 9px 20px;
        border: none;
        border-radius: 8px;
        background: #4f63d2;
        font-family: 'Inter', sans-serif;
        font-size: 14px;
        font-weight: 500;
        color: #ffffff;
        cursor: pointer;
        transition:
          background 0.15s ease,
          box-shadow 0.15s ease;
      }

      .btn-save:hover:not(:disabled) {
        background: #3d50bf;
        box-shadow:
          0 2px 10px
          rgba(79,99,210,0.3);
      }

      .btn-save:disabled,
      .btn-cancel:disabled,
      .modal-close:disabled {
        cursor: not-allowed;
        opacity: 0.65;
      }

      /* Responsive */


      .entries-header-with-views {
        gap: 18px;
        flex-wrap: wrap;
      }

      .entry-view-switcher {
        display: flex;
        gap: 6px;
        padding: 4px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        background: #f8fafc;
      }

      .view-btn {
        border: 0;
        border-radius: 7px;
        padding: 8px 12px;
        background: transparent;
        color: #64748b;
        font: inherit;
        font-size: 12px;
        cursor: pointer;
      }

      .view-btn-active {
        background: #ffffff;
        color: #1a2340;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12);
      }

      .entry-links {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
        margin-top: 10px;
      }

      .entry-links-label {
        font-size: 11px;
        font-weight: 600;
        color: #64748b;
      }

      .entry-link-chip {
        padding: 4px 8px;
        border-radius: 999px;
        background: #eef2ff;
        color: #3949ab;
        font-size: 11px;
      }

      .calendar-toolbar,
      .board-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin: 14px 0;
      }

      .calendar-grid {
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
        border-left: 1px solid #e2e8f0;
        border-top: 1px solid #e2e8f0;
      }

      .calendar-weekdays {
        border: 0;
      }

      .calendar-weekdays > div {
        padding: 8px;
        text-align: center;
        font-size: 11px;
        font-weight: 700;
        color: #64748b;
      }

      .calendar-cell {
        min-height: 112px;
        padding: 8px;
        border-right: 1px solid #e2e8f0;
        border-bottom: 1px solid #e2e8f0;
        background: #fff;
      }

      .calendar-cell-empty { background: #f8fafc; }
      .calendar-day-number { font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 6px; }
      .calendar-entry { display: grid; gap: 2px; margin-bottom: 6px; padding: 6px; border-radius: 7px; background: #eef2ff; font-size: 10px; color: #334155; }
      .calendar-entry strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .calendar-entry span, .calendar-entry small { color: #64748b; }

      .board-toolbar { justify-content: flex-start; }
      .board-toolbar label { font-size: 12px; font-weight: 600; color: #475569; }
      .board-select { padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; }
      .board-columns { display: flex; gap: 14px; overflow-x: auto; padding: 4px 0 12px; }
      .board-column { flex: 0 0 260px; padding: 10px; border-radius: 10px; background: #f1f5f9; }
      .board-column-header { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 10px; color: #334155; font-size: 12px; }
      .board-card { display: grid; gap: 5px; padding: 10px; margin-bottom: 8px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; font-size: 12px; }
      .board-card span, .board-card small { color: #64748b; }
      .view-empty { padding: 28px; text-align: center; color: #64748b; border: 1px dashed #cbd5e1; border-radius: 10px; }

      @media (max-width: 900px) {
        .breadcrumb-bar,
        .page-header,
        .project-content {
          padding-left: 24px;
          padding-right: 24px;
        }

        .project-stat-strip {
          flex-wrap: wrap;
        }

        .project-stat {
          min-width: 50%;
        }

        .stat-divider {
          display: none;
        }
      }

      @media (max-width: 600px) {
        .page-header {
          flex-direction: column;
          align-items: flex-start;
        }

        .page-header-actions {
          padding-top: 0;
        }

        .page-header-title {
          font-size: 24px;
        }

        .project-stat {
          min-width: 100%;
        }

        .add-field-row {
          flex-wrap: wrap;
        }

        .edit-entry-reference-grid {
          grid-template-columns: 1fr;
        }

        .edit-entry-new-field-grid {
          grid-template-columns: 1fr;
        }

        .add-field-type {
          width: 100%;
        }

        .btn-add-field {
          width: 100%;
        }

        .entry-row-header {
          flex-direction: column;
        }
      }
      .entry-feature-block {
        margin-top: 14px;
        padding-top: 14px;
        border-top: 1px solid #f1f5f9;
      }

      .entry-feature-heading {
        display: flex;
        align-items: center;
        gap: 7px;
        margin-bottom: 8px;
        color: #64748b;
        font-size: 12px;
        font-weight: 600;
      }

      .entry-checklist {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }

      .entry-checklist-item {
        display: flex;
        align-items: center;
        gap: 9px;
        color: #334155;
        font-size: 13px;
        cursor: pointer;
      }

      .entry-checklist-item input {
        width: 15px;
        height: 15px;
        accent-color: #4f63d2;
      }

      .entry-checklist-item--done span {
        color: #94a3b8;
        text-decoration: line-through;
      }

      .entry-checklist-row {
        display: flex;
        align-items: center;
        gap: 9px;
        color: #334155;
        font-size: 13px;
        min-width: 0;
      }

      .entry-checklist-row > span {
        flex: 1;
        min-width: 0;
      }

      .entry-checklist-edit-input {
        flex: 1;
        min-width: 0;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 5px 7px;
        font: 400 12px 'Inter', sans-serif;
      }

      .entry-checklist-actions {
        display: flex;
        gap: 5px;
        margin-left: auto;
      }

      .entry-checklist-action {
        border: 0;
        background: transparent;
        color: #4f63d2;
        font: 500 11px 'Inter', sans-serif;
        cursor: pointer;
        padding: 2px 3px;
      }

      .entry-checklist-delete {
        color: #b91c1c;
      }

      .entry-reference-list {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
      }

      .entry-reference-link {
        border: 1px solid #e2e8f0;
        background: #f8fafc;
        color: #4f63d2;
        border-radius: 7px;
        padding: 6px 9px;
        font: 500 12px 'Inter', sans-serif;
        cursor: pointer;
      }

      .entry-reference-link:hover {
        background: #eef2ff;
        border-color: #c7d2fe;
      }
      .edit-entry-add-field {
        white-space: nowrap;
      }

      .edit-entry-new-field-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 160px;
        gap: 8px;
        margin-bottom: 8px;
      }

      .edit-entry-reference-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
        margin-top: 18px;
      }

      .edit-entry-reference-section {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 12px;
      }

      .edit-entry-section-heading {
        color: #334155;
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 3px;
      }

      .edit-entry-reference-options {
        display: flex;
        flex-direction: column;
        gap: 7px;
        max-height: 150px;
        overflow: auto;
        margin-top: 10px;
      }

      .edit-entry-check-option {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #334155;
        font-size: 12px;
        cursor: pointer;
      }

      .edit-entry-check-option input {
        accent-color: #4f63d2;
      }

      .edit-entry-muted {
        color: #94a3b8;
        font-size: 12px;
      }

      .edit-entry-note {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 14px;
        color: #64748b;
        font-size: 11px;
      }

      .references-section {
        margin-top: 28px;
        margin-bottom: 28px;
        padding: 20px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
      }

      .references-section-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 14px;
      }

      .references-description {
        margin: 4px 0 0;
        color: #94a3b8;
        font-size: 12px;
      }

      .references-empty {
        margin: 0;
        color: #94a3b8;
        font-size: 13px;
      }

      .project-reference-list {
        margin-top: 4px;
      }

      .btn-small {
        padding: 7px 10px;
        font-size: 12px;
      }

      .entry-reference-manage {
        margin-top: 10px;
      }

      .entry-reference-manage-button {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: none;
        background: transparent;
        color: #64748b;
        padding: 0;
        font: 500 12px 'Inter', sans-serif;
        cursor: pointer;
      }

      .entry-reference-manage-button:hover {
        color: #4f63d2;
      }

      .entry-reference-manage-button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .reference-modal {
        max-width: 520px;
      }

      .reference-modal-description {
        margin: 5px 0 0;
        color: #94a3b8;
        font-size: 12px;
        line-height: 1.5;
      }

      .reference-selection-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 360px;
        overflow-y: auto;
      }

      .reference-selection-option {
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 42px;
        padding: 9px 11px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        color: #334155;
        background: #ffffff;
        font-size: 13px;
        cursor: pointer;
      }

      .reference-selection-option:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
      }

      .reference-selection-option--selected {
        background: #f8faff;
        border-color: #c7d2fe;
      }

      .reference-selection-option input {
        width: 15px;
        height: 15px;
        accent-color: #4f63d2;
      }

      .references-empty-modal {
        padding: 28px 12px;
        text-align: center;
        color: #94a3b8;
        font-size: 13px;
      }

    `}</style>
  );
}

/* =========================================================
 * ICONS
 * ======================================================= */

function IconLink() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function CheckSquare({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function IconPlus({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
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
  );
}

function IconEdit() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />

      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconArchive() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="21 8 21 21 3 21 3 8" />

      <rect
        x="1"
        y="3"
        width="22"
        height="5"
      />

      <line
        x1="10"
        y1="12"
        x2="14"
        y2="12"
      />
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

function IconEntryLarge() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
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

function IconClockSmall() {
  return (
    <svg
      width="13"
      height="13"
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

function IconInfo() {
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

      <line
        x1="12"
        y1="8"
        x2="12"
        y2="12"
      />

      <line
        x1="12"
        y1="16"
        x2="12.01"
        y2="16"
      />
    </svg>
  );
}

function IconXSmall() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line
        x1="18"
        y1="6"
        x2="6"
        y2="18"
      />

      <line
        x1="6"
        y1="6"
        x2="18"
        y2="18"
      />
    </svg>
  );
}

function IconGrip() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle
        cx="9"
        cy="6"
        r="1"
        fill="currentColor"
      />

      <circle
        cx="15"
        cy="6"
        r="1"
        fill="currentColor"
      />

      <circle
        cx="9"
        cy="12"
        r="1"
        fill="currentColor"
      />

      <circle
        cx="15"
        cy="12"
        r="1"
        fill="currentColor"
      />

      <circle
        cx="9"
        cy="18"
        r="1"
        fill="currentColor"
      />

      <circle
        cx="15"
        cy="18"
        r="1"
        fill="currentColor"
      />
    </svg>
  );
}

