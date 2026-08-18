import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import ProjectModal from "../../components/ProjectModal";
const FIELD_TYPES = [
    { value: "text", label: "Short text" },
    { value: "textarea", label: "Long text" },
    { value: "number", label: "Number" },
    { value: "date", label: "Date" },
];
export default function ProjectDetails() {
    const [collapsed, setSidebarCollapsed] = useState(false);
    const [showEntryModal, setShowEntryModal] = useState(false);
    const [showProjectModal, setShowProjectModal] = useState(false);
    // Replace this with the project entries returned by the backend.
    const [entries, setEntries] = useState([]);
    const navigate = useNavigate();
    return (<div className="app-shell">
      <Sidebar collapsed={collapsed} onToggle={() => setSidebarCollapsed((c) => !c)}/>

      <main className="app-main">
        {/* Breadcrumb */}
        <div className="breadcrumb-bar">
          <button className="breadcrumb-link" onClick={() => navigate("/projects")}>
            Projects
          </button>
          <span className="breadcrumb-sep">
            <IconChevronRight />
          </span>
          <span className="breadcrumb-current">Project Details</span>
        </div>

        {/* Page header */}
        <header className="page-header">
          <div className="page-header-left">
            <p className="page-header-eyebrow">Project</p>
            <h1 className="page-header-title project-name-placeholder">
              Project name
            </h1>
          </div>
          <div className="page-header-actions">
            <button className="btn btn-ghost" onClick={() => { }}>
              <IconArchive />
              Archive
            </button>
            <button className="btn btn-secondary" onClick={() => setShowProjectModal(true)}>
              <IconEdit />
              Edit Project
            </button>
            <button className="btn btn-primary" onClick={() => setShowEntryModal(true)}>
              <IconPlus />
              Add New Entry
            </button>
          </div>
        </header>

        <div className="project-content">
          {/* Stat strip */}
          <div className="project-stat-strip">
            <ProjectStat label="Total Entries" value="0" icon={<IconEntry />}/>
            <div className="stat-divider"/>
            <ProjectStat label="Logged Time" value="0 hrs" icon={<IconClock />}/>
            <div className="stat-divider"/>
            <ProjectStat label="Last Activity" value="—" icon={<IconCalendar />}/>
            <div className="stat-divider"/>
            <ProjectStat label="Created" value="—" icon={<IconInfo />}/>
          </div>

          {/* Recent entries */}
          <section className="entries-section">
            <div className="entries-header">
              <h2 className="entries-title">Entries</h2>
              <span className="entries-count">0 entries</span>
            </div>

            {/* Empty state */}
            <div className="entries-empty">
              <div className="empty-icon-wrap">
                <IconEntryLarge />
              </div>
              <p className="empty-heading">No entries yet.</p>
              <p className="empty-body">
                Add your first entry to start building a record for this project. Each entry captures a piece of your work.
              </p>
              <button className="btn btn-primary" onClick={() => setShowEntryModal(true)}>
                <IconPlus />
                Add New Entry
              </button>
            </div>
          </section>
        </div>
      </main>

      {/* New Entry Modal */}
      {showEntryModal && (<NewEntryModal onClose={() => setShowEntryModal(false)}/>)}

      {/* Edit Project = choose and edit an existing project entry */}
      {showProjectModal && (
        <ProjectModal
          mode="edit"
          entries={entries}
          onClose={() => setShowProjectModal(false)}
          onSave={(result) => {
            if (result?.type === "entry" && result.entry) {
              setEntries((current) =>
                current.map((entry) => entry.id === result.entry.id ? result.entry : entry)
              );
            }
            setShowProjectModal(false);
          }}
        />
      )}

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
        .breadcrumb-link:hover { color: #4f63d2; }
        .breadcrumb-sep { display: flex; align-items: center; color: #cbd5e1; }
        .breadcrumb-current { color: #94a3b8; font-weight: 400; }

        /* Page header */
        .page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 20px 40px 0;
          gap: 16px;
          flex-wrap: wrap;
        }
        .page-header-left { display: flex; flex-direction: column; gap: 4px; }
        .page-header-eyebrow {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #94a3b8;
          margin: 0;
        }
        .page-header-title {
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: 30px;
          font-weight: 400;
          color: #1a2340;
          margin: 0;
        }
        .project-name-placeholder {
          color: #cbd5e1;
          font-style: italic;
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
          gap: 7px;
          padding: 9px 16px;
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: background 0.15s ease, box-shadow 0.15s ease, color 0.15s ease;
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
        .btn:focus-visible { outline: 2px solid #4f63d2; outline-offset: 2px; }

        /* Project content */
        .project-content {
          padding: 24px 40px 40px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* Stat strip */
        .project-stat-strip {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          display: flex;
          align-items: stretch;
          padding: 0;
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
        .project-stat-text { display: flex; flex-direction: column; gap: 2px; }
        .project-stat-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #94a3b8;
        }
        .project-stat-value {
          font-family: 'DM Serif Display', Georgia, serif;
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

        /* Entries section */
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

        /* MODAL OVERLAY */
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
          box-shadow: 0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08);
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
          font-family: 'DM Serif Display', Georgia, serif;
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
          transition: background 0.15s ease, color 0.15s ease;
          padding: 0;
        }
        .modal-close:hover { background: #e2e8f0; color: #1e293b; }

        .modal-body {
          overflow-y: auto;
          flex: 1;
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Form fields */
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
        .form-input {
          padding: 9px 12px;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          color: #1e293b;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          background: #fff;
        }
        .form-input:focus {
          border-color: #4f63d2;
          box-shadow: 0 0 0 3px rgba(79,99,210,0.1);
        }
        .form-input::placeholder { color: #94a3b8; }
        .form-select {
          padding: 9px 12px;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          color: #1e293b;
          outline: none;
          background: #fff;
          cursor: pointer;
          width: 100%;
          transition: border-color 0.15s ease;
        }
        .form-select:focus {
          border-color: #4f63d2;
          box-shadow: 0 0 0 3px rgba(79,99,210,0.1);
        }

        /* Custom fields builder */
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
          cursor: grab;
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
          transition: color 0.15s ease, background 0.15s ease;
          flex-shrink: 0;
        }
        .field-row-remove:hover { color: #ef4444; background: rgba(239,68,68,0.06); }

        /* Add field row */
        .add-field-row {
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }
        .add-field-name { flex: 1; }
        .add-field-type { width: 140px; flex-shrink: 0; }
        .btn-add-field {
          display: inline-flex;
          align-items: center;
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
          transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .btn-add-field:hover {
          border-color: #4f63d2;
          color: #4f63d2;
          background: rgba(79,99,210,0.04);
        }

        /* Modal footer */
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
        .btn-cancel:hover { background: #f8fafc; }
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
          transition: background 0.15s ease, box-shadow 0.15s ease;
        }
        .btn-save:hover {
          background: #3d50bf;
          box-shadow: 0 2px 10px rgba(79,99,210,0.3);
        }

        /* Responsive */
        @media (max-width: 900px) {
          .breadcrumb-bar, .page-header, .project-content {
            padding-left: 24px;
            padding-right: 24px;
          }
          .project-stat-strip {
            flex-wrap: wrap;
          }
          .project-stat {
            min-width: 50%;
          }
          .stat-divider { display: none; }
        }
        @media (max-width: 600px) {
          .page-header { flex-direction: column; align-items: flex-start; }
          .page-header-actions { padding-top: 0; }
          .page-header-title { font-size: 24px; }
          .project-stat { min-width: 100%; }
          .add-field-row { flex-wrap: wrap; }
          .add-field-type { width: 100%; }
        }
      `}</style>
    </div>);
}
/* ─── New Entry Modal ─── */
function NewEntryModal({ onClose }) {
    const [entryName, setEntryName] = useState("");
    const [fields, setFields] = useState([]);
    const [newFieldLabel, setNewFieldLabel] = useState("");
    const [newFieldType, setNewFieldType] = useState("text");
    function addField() {
        const label = newFieldLabel.trim();
        if (!label)
            return;
        setFields((prev) => [
            ...prev,
            { id: crypto.randomUUID(), label, type: newFieldType },
        ]);
        setNewFieldLabel("");
        setNewFieldType("text");
    }
    function removeField(id) {
        setFields((prev) => prev.filter((f) => f.id !== id));
    }
    return (<div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget)
        onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <h2 className="modal-title" id="modal-title">New Entry</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <IconXSmall />
          </button>
        </div>

        <div className="modal-body">
          {/* Entry name */}
          <div className="form-field">
            <label className="form-label form-label-required" htmlFor="entry-name">
              Entry name
            </label>
            <input id="entry-name" className="form-input" type="text" placeholder="e.g. Literature Review, Lab Session 3…" value={entryName} onChange={(e) => setEntryName(e.target.value)} autoFocus/>
          </div>

          {/* Custom fields section */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p className="fields-section-label">Custom fields</p>

            {fields.length > 0 && (<div className="fields-list">
                {fields.map((field) => (<div key={field.id} className="field-row">
                    <span className="field-row-drag">
                      <IconGrip />
                    </span>
                    <span className="field-row-name">{field.label}</span>
                    <span className="field-row-type">
                      {FIELD_TYPES.find((t) => t.value === field.type)?.label}
                    </span>
                    <button className="field-row-remove" onClick={() => removeField(field.id)} aria-label={`Remove ${field.label}`}>
                      <IconXSmall />
                    </button>
                  </div>))}
              </div>)}

            {/* Add field row */}
            <div className="add-field-row">
              <div className="form-field add-field-name">
                <label className="form-label" htmlFor="field-label">Field name</label>
                <input id="field-label" className="form-input" type="text" placeholder="e.g. Duration, Notes, Source…" value={newFieldLabel} onChange={(e) => setNewFieldLabel(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter")
        addField(); }}/>
              </div>
              <div className="form-field add-field-type">
                <label className="form-label" htmlFor="field-type">Type</label>
                <select id="field-type" className="form-select" value={newFieldType} onChange={(e) => setNewFieldType(e.target.value)}>
                  {FIELD_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                </select>
              </div>
              <button className="btn-add-field" onClick={addField} type="button">
                <IconPlus size={14}/>
                Add field
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={onClose}>Save &amp; Create Entry</button>
        </div>
      </div>
    </div>);
}
/* ─── Sub-components ─── */
function ProjectStat({ label, value, icon }) {
    return (<div className="project-stat">
      <div className="project-stat-icon">{icon}</div>
      <div className="project-stat-text">
        <span className="project-stat-label">{label}</span>
        <span className="project-stat-value">{value}</span>
      </div>
    </div>);
}
/* ─── Icons ─── */
function IconChevronRight() {
    return (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>);
}
function IconPlus({ size = 16 }) {
    return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>);
}
function IconEdit() {
    return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>);
}
function IconArchive() {
    return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>
    </svg>);
}
function IconEntry() {
    return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      <line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>
    </svg>);
}
function IconEntryLarge() {
    return (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      <line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>
    </svg>);
}
function IconClock() {
    return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>);
}
function IconCalendar() {
    return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>);
}
function IconInfo() {
    return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>);
}
function IconXSmall() {
    return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>);
}
function IconGrip() {
    return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="6" r="1" fill="currentColor"/><circle cx="15" cy="6" r="1" fill="currentColor"/>
      <circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/>
      <circle cx="9" cy="18" r="1" fill="currentColor"/><circle cx="15" cy="18" r="1" fill="currentColor"/>
    </svg>);
}
