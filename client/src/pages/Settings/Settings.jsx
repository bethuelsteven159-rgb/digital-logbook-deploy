import { useEffect, useRef, useState } from "react";
import {
  applyTheme,
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
  PREFERENCES_EVENT,
} from "../../utils/preferences";
import Sidebar from "../../components/Sidebar";
import {
  exportLogbook,
  importLogbook,
} from "../../api/logbookTransferApi";

export default function Settings() {
  const [collapsed, setCollapsed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [preferences, setPreferences] = useState(loadPreferences);

  const fileInputRef = useRef(null);

  useEffect(() => {
    applyTheme(preferences.theme);
    localStorage.setItem(
      "digitalLogbookPreferences",
      JSON.stringify(preferences),
    );
  }, [preferences]);

  useEffect(() => {
    function handlePreferencesChanged(event) {
      const next = event.detail || loadPreferences();
      setPreferences({ ...DEFAULT_PREFERENCES, ...next });
    }

    window.addEventListener(PREFERENCES_EVENT, handlePreferencesChanged);
    return () =>
      window.removeEventListener(PREFERENCES_EVENT, handlePreferencesChanged);
  }, []);

  useEffect(() => {
    function handleSystemThemeChange() {
      if (loadPreferences().theme === "system") {
        applyTheme("system");
      }
    }

    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    media?.addEventListener?.("change", handleSystemThemeChange);
    return () => media?.removeEventListener?.("change", handleSystemThemeChange);
  }, []);

  function updatePreference(key, value) {
    setPreferences((current) => {
      const next = {
        ...current,
        [key]: value,
      };

      savePreferences(next);
      return next;
    });
  }

  async function handleExport() {
    try {
      setBusy(true);
      setError("");
      setMessage("");

      const data = await exportLogbook();

      const blob = new Blob(
        [JSON.stringify(data, null, 2)],
        {
          type: "application/json",
        },
      );

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = `digital-logbook-export-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(url);

      setMessage(
        "Your logbook was exported successfully.",
      );
    } catch (requestError) {
      setError(
        requestError.message ||
          "Failed to export your logbook.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleImport(event) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      setBusy(true);
      setError("");
      setMessage("");

      const text = await file.text();

      let payload;

      try {
        payload = JSON.parse(text);
      } catch {
        throw new Error(
          "The selected file is not valid JSON.",
        );
      }

      const result = await importLogbook(payload);

      const importedProjects =
        result.projectsImported ?? 0;

      const updatedProjects =
        result.projectsUpdated ?? 0;

      const importedFields =
        result.fieldsImported ?? 0;

      const updatedFields =
        result.fieldsUpdated ?? 0;

      const importedEntries =
        result.entriesImported ?? 0;

      const updatedEntries =
        result.entriesUpdated ?? 0;

      const importedValues =
        result.valuesImported ?? 0;

      const updatedValues =
        result.valuesUpdated ?? 0;

      const importedChecklist =
        result.checklistImported ?? 0;

      const updatedChecklist =
        result.checklistUpdated ?? 0;

      const importedReferences =
        result.referencesImported ?? 0;

      setMessage(
        `Import completed successfully. ` +
          `${importedProjects} new project(s), ` +
          `${updatedProjects} project(s) updated, ` +
          `${importedEntries} new entr${importedEntries === 1 ? "y" : "ies"}, ` +
          `${updatedEntries} entr${updatedEntries === 1 ? "y" : "ies"} updated, ` +
          `${importedFields} new field(s), ` +
          `${updatedFields} field(s) updated, ` +
          `${importedValues} new value(s), ` +
          `${updatedValues} value(s) updated, ` +
          `${importedChecklist} new checklist item(s), ` +
          `${updatedChecklist} checklist item(s) updated, and ` +
          `${importedReferences} new reference(s).`,
      );
    } catch (requestError) {
      setError(
        requestError.message ||
          "Failed to import your logbook.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="settings-shell">
      <Sidebar
        collapsed={collapsed}
        onToggle={() =>
          setCollapsed((current) => !current)
        }
      />

      <main className="settings-main">
        <header className="settings-header">
          <p className="settings-eyebrow">Settings</p>
          <h1 className="settings-title">
            Application settings
          </h1>
          <p className="settings-subtitle">
            Manage preferences and logbook data.
          </p>
        </header>

        <div className="settings-content">
          {/* APPLICATION PREFERENCES */}

          <section className="settings-section">
            <div className="settings-section-header">
              <div className="settings-section-icon">
                <IconSliders />
              </div>

              <div>
                <h2>Application preferences</h2>
                <p>
                  Customize how the Digital Logbook
                  looks and displays your information.
                </p>
              </div>
            </div>

            <div className="settings-options">
              <div className="settings-option">
                <div className="settings-option-text">
                  <h3>Theme</h3>
                  <p>
                    Choose how the application should
                    appear.
                  </p>
                </div>

                <select
                  value={preferences.theme}
                  onChange={(event) =>
                    updatePreference(
                      "theme",
                      event.target.value,
                    )
                  }
                  className="settings-select"
                >
                  <option value="system">
                    System default
                  </option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>

              <div className="settings-option">
                <div className="settings-option-text">
                  <h3>Entry order</h3>
                  <p>
                    Choose how entries are ordered when
                    displayed.
                  </p>
                </div>

                <select
                  value={preferences.entryOrder}
                  onChange={(event) =>
                    updatePreference(
                      "entryOrder",
                      event.target.value,
                    )
                  }
                  className="settings-select"
                >
                  <option value="newest">
                    Newest first
                  </option>
                  <option value="oldest">
                    Oldest first
                  </option>
                </select>
              </div>

              <div className="settings-option">
                <div className="settings-option-text">
                  <h3>Project order</h3>
                  <p>
                    Choose how projects are ordered in
                    project lists.
                  </p>
                </div>

                <select
                  value={preferences.projectOrder}
                  onChange={(event) =>
                    updatePreference(
                      "projectOrder",
                      event.target.value,
                    )
                  }
                  className="settings-select"
                >
                  <option value="recent">
                    Recently updated
                  </option>
                  <option value="newest">
                    Newest first
                  </option>
                  <option value="alphabetical">
                    Alphabetical
                  </option>
                </select>
              </div>
            </div>
          </section>

          {/* DATA MANAGEMENT */}

          <section className="settings-section">
            <div className="settings-section-header">
              <div className="settings-section-icon">
                <IconDatabase />
              </div>

              <div>
                <h2>Data management</h2>
                <p>
                  Export your logbook for backup or
                  import a previously exported JSON file.
                </p>
              </div>
            </div>

            <div className="data-management-card">
              <div className="data-management-info">
                <h3>Logbook backup</h3>

                <p>
                  Your export includes projects, custom
                  fields, entries, field values,
                  checklists and project references.
                </p>

                <p className="settings-note">
                  Importing an existing export updates
                  matching records instead of creating
                  duplicates.
                </p>
              </div>

              <div className="settings-actions">
                <button
                  type="button"
                  className="settings-button settings-button-primary"
                  onClick={handleExport}
                  disabled={busy}
                >
                  <IconDownload />
                  {busy
                    ? "Working…"
                    : "Export logbook"}
                </button>

                <button
                  type="button"
                  className="settings-button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={busy}
                >
                  <IconUpload />
                  Import logbook
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleImport}
                  hidden
                />
              </div>
            </div>

            {message && (
              <div className="settings-message settings-message-success">
                <IconCheck />
                <span>{message}</span>
              </div>
            )}

            {error && (
              <div className="settings-message settings-message-error">
                <IconAlert />
                <span>{error}</span>
              </div>
            )}
          </section>

          {/* DATA & RESET */}

          <section className="settings-section">
            <div className="settings-section-header">
              <div className="settings-section-icon settings-section-icon-muted">
                <IconRotate />
              </div>

              <div>
                <h2>Data &amp; reset</h2>
                <p>
                  Manage application reset options.
                </p>
              </div>
            </div>

            <div className="coming-soon-card">
              <div className="coming-soon-icon">
                <IconClock />
              </div>

              <div>
                <h3>Reset options</h3>
                <p>
                  Reset and data-clearing options will
                  become available in a future version.
                </p>
              </div>

              <span className="coming-soon-badge">
                Available soon
              </span>
            </div>
          </section>
        </div>
      </main>

      <style>{`
        .settings-shell {
          display: flex;
          min-height: 100vh;
          background: #f8fafc;
        }

        .settings-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .settings-header {
          padding: 32px 40px 0;
        }

        .settings-eyebrow {
          margin: 0 0 4px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: #94a3b8;
        }

        .settings-title {
          margin: 0;
          color: #1a2340;
          font: 400 30px 'DM Serif Display', Georgia, serif;
        }

        .settings-subtitle {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.5;
        }

        .settings-content {
          width: min(900px, calc(100% - 80px));
          margin: 42px auto 60px;
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .settings-section {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
        }

        .settings-section-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 26px 28px;
          border-bottom: 1px solid #eef2f7;
        }

        .settings-section-icon {
          width: 44px;
          height: 44px;
          flex: 0 0 44px;
          border-radius: 10px;
          background: #eef2ff;
          color: #4f63d2;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .settings-section-icon svg {
          width: 21px;
          height: 21px;
        }

        .settings-section-icon-muted {
          background: #f1f5f9;
          color: #64748b;
        }

        .settings-section-header h2 {
          margin: 1px 0 5px;
          color: #1a2340;
          font: 400 22px 'DM Serif Display', Georgia, serif;
        }

        .settings-section-header p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.5;
        }

        .settings-options {
          padding: 0 28px;
        }

        .settings-option {
          min-height: 82px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          border-bottom: 1px solid #eef2f7;
        }

        .settings-option:last-child {
          border-bottom: 0;
        }

        .settings-option-text {
          min-width: 0;
        }

        .settings-option-text h3 {
          margin: 0 0 4px;
          color: #334155;
          font-size: 14px;
          font-weight: 600;
        }

        .settings-option-text p {
          margin: 0;
          color: #94a3b8;
          font-size: 12px;
          line-height: 1.45;
        }

        .settings-select {
          min-width: 170px;
          padding: 9px 34px 9px 11px;
          border: 1px solid #dbe2ea;
          border-radius: 8px;
          background: #fff;
          color: #334155;
          font: 500 13px 'Inter', sans-serif;
          cursor: pointer;
          outline: none;
        }

        .settings-select:focus {
          border-color: #4f63d2;
          box-shadow: 0 0 0 3px rgba(79, 99, 210, .1);
        }

        .data-management-card {
          padding: 26px 28px;
        }

        .data-management-info h3 {
          margin: 0 0 7px;
          color: #334155;
          font-size: 14px;
          font-weight: 600;
        }

        .data-management-info p {
          margin: 0;
          max-width: 680px;
          color: #64748b;
          font-size: 13px;
          line-height: 1.6;
        }

        .data-management-info .settings-note {
          margin-top: 8px;
          color: #94a3b8;
          font-size: 12px;
        }

        .settings-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 22px;
        }

        .settings-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid #dbe2ea;
          background: #fff;
          color: #334155;
          border-radius: 8px;
          padding: 10px 15px;
          font: 500 13px 'Inter', sans-serif;
          cursor: pointer;
          transition: background .15s ease, border-color .15s ease;
        }

        .settings-button svg {
          width: 16px;
          height: 16px;
        }

        .settings-button:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .settings-button-primary {
          background: #4f63d2;
          border-color: #4f63d2;
          color: #fff;
        }

        .settings-button-primary:hover:not(:disabled) {
          background: #4356c1;
          border-color: #4356c1;
        }

        .settings-button:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .settings-message {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin: 0 28px 26px;
          padding: 12px 14px;
          border-radius: 8px;
          font-size: 12px;
          line-height: 1.5;
        }

        .settings-message svg {
          width: 16px;
          height: 16px;
          flex: 0 0 16px;
          margin-top: 1px;
        }

        .settings-message-success {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
        }

        .settings-message-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
        }

        .coming-soon-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 24px 28px;
        }

        .coming-soon-icon {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          border-radius: 9px;
          background: #f8fafc;
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .coming-soon-icon svg {
          width: 19px;
          height: 19px;
        }

        .coming-soon-card h3 {
          margin: 0 0 4px;
          color: #475569;
          font-size: 14px;
          font-weight: 600;
        }

        .coming-soon-card p {
          margin: 0;
          color: #94a3b8;
          font-size: 12px;
          line-height: 1.5;
        }

        .coming-soon-badge {
          margin-left: auto;
          flex: 0 0 auto;
          padding: 6px 9px;
          border-radius: 999px;
          background: #f1f5f9;
          color: #64748b;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
        }

        @media (max-width: 900px) {
          .settings-header {
            padding-left: 24px;
            padding-right: 24px;
          }

          .settings-content {
            width: calc(100% - 48px);
          }
        }

        @media (max-width: 650px) {
          .settings-header {
            padding-top: 24px;
          }

          .settings-title {
            font-size: 25px;
          }

          .settings-content {
            margin-top: 30px;
          }

          .settings-section-header {
            padding: 22px;
          }

          .settings-options {
            padding: 0 22px;
          }

          .settings-option {
            align-items: flex-start;
            flex-direction: column;
            padding: 18px 0;
            gap: 12px;
          }

          .settings-select {
            width: 100%;
          }

          .data-management-card {
            padding: 22px;
          }

          .coming-soon-card {
            align-items: flex-start;
            flex-wrap: wrap;
            padding: 22px;
          }

          .coming-soon-badge {
            margin-left: 54px;
            margin-top: -5px;
          }

          .settings-message {
            margin-left: 22px;
            margin-right: 22px;
          }
        }
      `}</style>
    </div>
  );
}

function IconSliders() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="9" cy="6" r="2" />
      <circle cx="15" cy="12" r="2" />
      <circle cx="11" cy="18" r="2" />
    </svg>
  );
}

function IconDatabase() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="7" ry="3" />
      <path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
      <path d="M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function IconUpload() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21V9" />
      <path d="m7 14 5-5 5 5" />
      <path d="M5 3h14" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3 2.5 20h19L12 3Z" />
      <path d="M12 9v5" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function IconRotate() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 15.2-6.5L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.2 6.5L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}