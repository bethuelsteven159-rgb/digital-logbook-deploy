import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar.jsx";
import { fetchProjects } from "../../api/projectsApi.js";
import {
  fetchProjectDetails,
  searchOwnedEntries,
} from "../../api/projectDetailsApi.js";

const EMPTY_FILTERS = {
  query: "",
  projectId: "",
  fromDate: "",
  toDate: "",
  minDuration: "",
  maxDuration: "",
  completed: "",
  sort: "relevance",
};

export default function SearchEntries() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [projects, setProjects] = useState([]);
  const [fields, setFields] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [showMore, setShowMore] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingFields, setLoadingFields] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      setLoadingProjects(true);
      try {
        const [active, archived] = await Promise.all([
          fetchProjects("active"),
          fetchProjects("archived"),
        ]);
        if (cancelled) return;
        const combined = [...(Array.isArray(active) ? active : []), ...(Array.isArray(archived) ? archived : [])];
        const unique = Array.from(new Map(combined.map((project) => [project.id, project])).values());
        unique.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
        setProjects(unique);
      } catch (requestError) {
        if (!cancelled) setError(requestError.message || "Failed to load projects.");
      } finally {
        if (!cancelled) setLoadingProjects(false);
      }
    }

    loadProjects();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setCustomFields([]);

    if (!filters.projectId) {
      setFields([]);
      return () => { cancelled = true; };
    }

    async function loadFields() {
      setLoadingFields(true);
      try {
        const details = await fetchProjectDetails(filters.projectId);
        if (!cancelled) setFields(Array.isArray(details?.fields) ? details.fields : []);
      } catch (requestError) {
        if (!cancelled) {
          setFields([]);
          setError(requestError.message || "Failed to load project fields.");
        }
      } finally {
        if (!cancelled) setLoadingFields(false);
      }
    }

    loadFields();
    return () => { cancelled = true; };
  }, [filters.projectId]);

  const searchableFields = useMemo(
    () => fields.filter((field) => field.fieldType !== "computed"),
    [fields],
  );

  const matchingProjects = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    if (!searched || !query) return [];
    return projects.filter((project) => {
      if (filters.projectId && project.id !== filters.projectId) return false;
      return (
        String(project.name || "").toLowerCase().includes(query) ||
        String(project.description || "").toLowerCase().includes(query)
      );
    });
  }, [filters.projectId, filters.query, projects, searched]);

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function addCustomField() {
    if (!filters.projectId || searchableFields.length === 0) return;
    setCustomFields((current) => [
      ...current,
      { fieldId: searchableFields[0].id, value: "" },
    ]);
  }

  function updateCustomField(index, key, value) {
    setCustomFields((current) => current.map((filter, currentIndex) =>
      currentIndex === index ? { ...filter, [key]: value } : filter,
    ));
  }

  function removeCustomField(index) {
    setCustomFields((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleSearch(event) {
    event?.preventDefault();
    setSearching(true);
    setError("");
    setSearched(true);

    try {
      const data = await searchOwnedEntries({
        ...filters,
        completed: filters.completed === "" ? undefined : filters.completed === "true",
        customFields,
      });
      setResults(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setResults([]);
      setError(requestError.message || "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() {
    setFilters(EMPTY_FILTERS);
    setCustomFields([]);
    setResults([]);
    setSearched(false);
    setError("");
  }

  return (
    <div className="search-page-shell">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
      <main className="search-page-main">
        <header className="search-page-header">
          <p className="search-eyebrow">Logbook</p>
          <h1>Search Your Logbook</h1>
          <p>Search projects and entries across your record, then narrow the results with filters.</p>
        </header>

        <form className="search-panel" onSubmit={handleSearch}>
          <div className="search-primary-row">
            <input
              aria-label="Search your logbook"
              className="search-text-input"
              type="search"
              placeholder="Search projects, entries, tags, or custom field values..."
              value={filters.query}
              onChange={(event) => updateFilter("query", event.target.value)}
            />
            <select
              aria-label="Project"
              className="search-select"
              value={filters.projectId}
              disabled={loadingProjects}
              onChange={(event) => updateFilter("projectId", event.target.value)}
            >
              <option value="">All projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name || "Untitled Project"}{project.archivedAt ? " (Archived)" : ""}
                </option>
              ))}
            </select>
            <button className="search-button" type="submit" disabled={searching}>
              {searching ? "Searching..." : "Search"}
            </button>
          </div>

          <div className="search-panel-actions">
            <button type="button" className="link-button" onClick={() => setShowMore((value) => !value)}>
              {showMore ? "− Fewer filters" : "+ More filters"}
            </button>
            {(searched || filters.query || filters.projectId) && (
              <button type="button" className="link-button muted" onClick={clearSearch}>Clear search</button>
            )}
          </div>

          {showMore && (
            <div className="advanced-filters">
              <label>From date<input type="date" value={filters.fromDate} onChange={(event) => updateFilter("fromDate", event.target.value)} /></label>
              <label>To date<input type="date" value={filters.toDate} onChange={(event) => updateFilter("toDate", event.target.value)} /></label>
              <label>Min minutes<input type="number" min="0" placeholder="Any" value={filters.minDuration} onChange={(event) => updateFilter("minDuration", event.target.value)} /></label>
              <label>Max minutes<input type="number" min="0" placeholder="Any" value={filters.maxDuration} onChange={(event) => updateFilter("maxDuration", event.target.value)} /></label>
              <label>Status<select value={filters.completed} onChange={(event) => updateFilter("completed", event.target.value)}><option value="">All statuses</option><option value="false">Incomplete</option><option value="true">Completed</option></select></label>
              <label>Sort by<select value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value)}><option value="relevance">Relevance</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name</option><option value="duration">Longest duration</option></select></label>

              <div className="custom-filter-section">
                <div className="custom-filter-heading">
                  <div><strong>Custom fields</strong><span>{filters.projectId ? "Narrow results using fields from the selected project." : "Select a project to use specific custom-field filters."}</span></div>
                  <button type="button" onClick={addCustomField} disabled={!filters.projectId || loadingFields || searchableFields.length === 0}>+ Add field</button>
                </div>
                {customFields.map((filter, index) => (
                  <div className="custom-filter-row" key={`${index}-${filter.fieldId}`}>
                    <select value={filter.fieldId} onChange={(event) => updateCustomField(index, "fieldId", event.target.value)}>
                      {searchableFields.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}
                    </select>
                    <input placeholder="Value contains..." value={filter.value} onChange={(event) => updateCustomField(index, "value", event.target.value)} />
                    <button type="button" aria-label="Remove custom field filter" onClick={() => removeCustomField(index)}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>

        {error && <div className="search-error" role="alert">{error}</div>}

        <section className="results-section">
          {searched && !searching && (
            <>
              {matchingProjects.length > 0 && (
                <div className="project-results-block">
                  <div className="results-heading"><h2>Projects</h2><span>{matchingProjects.length} {matchingProjects.length === 1 ? "project" : "projects"}</span></div>
                  <div className="project-result-grid">
                    {matchingProjects.map((project) => (
                      <button className="project-result-card" type="button" key={project.id} onClick={() => navigate(`/projects/${project.id}`)}>
                        <strong>{project.name || "Untitled Project"}</strong>
                        <span>{project.description || "No description has been added yet."}</span>
                        <small>{project.totalEntries || 0} {(project.totalEntries || 0) === 1 ? "entry" : "entries"}</small>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="results-heading entry-results-heading"><h2>Entries</h2><span>{results.length} {results.length === 1 ? "entry" : "entries"}</span></div>
            </>
          )}
          {!searched ? (
            <div className="search-empty"><h2>Find work from across your logbook</h2><p>Search by project, entry name, tag, or values stored in your custom fields.</p></div>
          ) : !searching && results.length === 0 && matchingProjects.length === 0 && !error ? (
            <div className="search-empty"><h2>No results found</h2><p>Try a different search term or remove one of the filters.</p></div>
          ) : results.length === 0 ? null : (
            <div className="result-list">
              {results.map((entry) => (
                <button className="result-card" type="button" key={entry.id} onClick={() => navigate(`/projects/${entry.projectId}`)}>
                  <div className="result-card-top"><span className="project-pill">{entry.projectName || "Project"}</span>{entry.completedAt && <span className="completed-pill">Completed</span>}</div>
                  <h3>{entry.name || "Untitled Entry"}</h3>
                  <p>{formatDate(entry.occurredAt)}{entry.durationMinutes != null ? ` • ${entry.durationMinutes} min` : ""}</p>
                  {Array.isArray(entry.tags) && entry.tags.length > 0 && <div className="tag-row">{entry.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}
                  {Array.isArray(entry.values) && entry.values.length > 0 && <div className="value-preview">{entry.values.slice(0, 3).map((value) => <span key={value.fieldId}><strong>{value.name}:</strong> {formatValue(value.value)}</span>)}</div>}
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

      <style>{`
        .search-page-shell{display:flex;min-height:100vh;background:#f8fafc}.search-page-main{flex:1;min-width:0;padding:32px 40px 48px;color:#1e293b}.search-page-header{max-width:900px;margin:0 auto 24px}.search-eyebrow{margin:0 0 4px;color:#94a3b8;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.search-page-header h1{margin:0;font-family:'DM Serif Display',Georgia,serif;font-size:32px;font-weight:400;color:#1a2340}.search-page-header>p:last-child{margin:8px 0 0;color:#64748b;font-size:14px}.search-panel,.results-section,.search-error{max-width:900px;margin-left:auto;margin-right:auto}.search-panel{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:18px;box-shadow:0 4px 14px rgba(15,23,42,.04)}.search-primary-row{display:grid;grid-template-columns:minmax(0,1fr) 220px auto;gap:10px}.search-text-input,.search-select,.advanced-filters input,.advanced-filters select,.custom-filter-row input,.custom-filter-row select{width:100%;box-sizing:border-box;border:1.5px solid #e2e8f0;border-radius:8px;background:#fff;padding:10px 12px;font:14px 'Inter',sans-serif;color:#1e293b;outline:none}.search-text-input:focus,.search-select:focus,.advanced-filters input:focus,.advanced-filters select:focus{border-color:#4f63d2;box-shadow:0 0 0 3px rgba(79,99,210,.1)}.search-button{border:0;border-radius:8px;background:#4f63d2;color:#fff;padding:10px 20px;font-weight:600;cursor:pointer}.search-button:disabled{opacity:.65;cursor:default}.search-panel-actions{display:flex;gap:16px;margin-top:12px}.link-button{border:0;background:none;padding:0;color:#4f63d2;font-weight:600;cursor:pointer}.link-button.muted{color:#64748b}.advanced-filters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:18px;padding-top:18px;border-top:1px solid #e2e8f0}.advanced-filters label{display:flex;flex-direction:column;gap:6px;color:#64748b;font-size:12px;font-weight:600}.custom-filter-section{grid-column:1/-1;padding-top:4px}.custom-filter-heading{display:flex;align-items:center;justify-content:space-between;gap:16px}.custom-filter-heading div{display:flex;flex-direction:column;gap:3px}.custom-filter-heading strong{font-size:13px}.custom-filter-heading span{font-size:12px;color:#94a3b8}.custom-filter-heading button{border:1px solid #cbd5e1;border-radius:7px;background:#fff;padding:7px 10px;color:#4f63d2;font-weight:600;cursor:pointer}.custom-filter-heading button:disabled{color:#94a3b8;cursor:default}.custom-filter-row{display:grid;grid-template-columns:220px 1fr 36px;gap:8px;margin-top:10px}.custom-filter-row button{border:0;border-radius:7px;background:#f1f5f9;color:#64748b;font-size:20px;cursor:pointer}.search-error{margin-top:16px;padding:12px 14px;border:1px solid #fecaca;border-radius:9px;background:#fef2f2;color:#b91c1c;font-size:13px}.results-section{margin-top:24px}.results-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.results-heading h2{margin:0;font-size:18px}.results-heading span{font-size:12px;color:#94a3b8}.result-list{display:flex;flex-direction:column;gap:10px}.result-card{width:100%;border:1px solid #e2e8f0;border-radius:12px;background:#fff;padding:18px;text-align:left;cursor:pointer;transition:border-color .15s,box-shadow .15s}.result-card:hover{border-color:#cbd5e1;box-shadow:0 5px 16px rgba(15,23,42,.06)}.result-card-top{display:flex;gap:8px;align-items:center}.project-pill,.completed-pill{display:inline-flex;border-radius:999px;padding:3px 8px;font-size:10px;font-weight:700}.project-pill{background:#eef2ff;color:#4f63d2}.completed-pill{background:#ecfdf5;color:#047857}.result-card h3{margin:9px 0 5px;font-size:17px;color:#1a2340}.result-card p{margin:0;color:#64748b;font-size:13px}.tag-row,.value-preview{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.tag-row span{color:#64748b;font-size:12px}.value-preview span{border-radius:6px;background:#f8fafc;padding:5px 8px;color:#64748b;font-size:11px}.project-results-block{margin-bottom:24px}.project-result-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.project-result-card{display:flex;flex-direction:column;gap:6px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;padding:16px;text-align:left;cursor:pointer}.project-result-card:hover{border-color:#4f63d2;box-shadow:0 4px 14px rgba(15,23,42,.05)}.project-result-card strong{font-size:16px;color:#1a2340}.project-result-card span{font-size:13px;color:#64748b}.project-result-card small{font-size:11px;color:#94a3b8}.entry-results-heading{margin-top:18px}.search-empty{padding:64px 24px;text-align:center;color:#64748b}.search-empty h2{margin:0 0 8px;color:#334155;font-size:18px}.search-empty p{margin:0;font-size:14px}@media(max-width:800px){.search-page-main{padding:24px}.search-primary-row{grid-template-columns:1fr}.advanced-filters{grid-template-columns:1fr 1fr}}@media(max-width:560px){.search-page-main{padding:20px 16px}.advanced-filters{grid-template-columns:1fr}.custom-filter-row{grid-template-columns:1fr 36px}.custom-filter-row select{grid-column:1/-1}}
      `}</style>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-ZA", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}
