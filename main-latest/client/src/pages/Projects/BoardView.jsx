import { useEffect, useMemo, useState } from "react";
import { groupEntriesByField } from "./entryViews";

export default function BoardView({ entries, fields, formatLoggedTime }) {
  const [fieldId, setFieldId] = useState(fields[0]?.id || "");
  useEffect(() => {
    if (!fields.some((field) => field.id === fieldId)) setFieldId(fields[0]?.id || "");
  }, [fields, fieldId]);

  const groups = useMemo(() => fieldId ? groupEntriesByField(entries, fieldId) : {}, [entries, fieldId]);

  if (fields.length === 0) {
    return <div className="view-empty">Add at least one custom project field before using Board view.</div>;
  }

  return (
    <div className="board-view">
      <div className="board-toolbar">
        <label htmlFor="board-field">Group entries by</label>
        <select id="board-field" className="board-select" value={fieldId} onChange={(event) => setFieldId(event.target.value)}>
          {fields.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}
        </select>
      </div>
      <div className="board-columns">
        {Object.entries(groups).map(([groupName, groupEntries]) => (
          <section className="board-column" key={groupName}>
            <div className="board-column-header"><strong>{groupName}</strong><span>{groupEntries.length}</span></div>
            {groupEntries.map((entry) => (
              <article className="board-card" key={entry.id}>
                <strong>{entry.name}</strong>
                <span>{formatLoggedTime(entry.durationMinutes)}</span>
                {entry.linkedEntries?.length > 0 && <small>Linked: {entry.linkedEntries.map((item) => item.name).join(', ')}</small>}
              </article>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
