import { useMemo, useState } from "react";
import { groupEntriesByDate } from "./entryViews";

export default function CalendarView({ entries, formatLoggedTime }) {
  const initial = new Date();
  const [monthDate, setMonthDate] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const grouped = useMemo(() => groupEntriesByDate(entries), [entries]);

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = new Intl.DateTimeFormat("en-ZA", { month: "long", year: "numeric" }).format(monthDate);

  function keyForDay(day) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return (
    <div className="calendar-view">
      <div className="calendar-toolbar">
        <button type="button" className="view-btn" onClick={() => setMonthDate(new Date(year, month - 1, 1))}>Previous</button>
        <strong>{monthLabel}</strong>
        <button type="button" className="view-btn" onClick={() => setMonthDate(new Date(year, month + 1, 1))}>Next</button>
      </div>
      <div className="calendar-grid calendar-weekdays">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day) => <div key={day}>{day}</div>)}
      </div>
      <div className="calendar-grid">
        {cells.map((day, index) => {
          const dayEntries = day ? grouped[keyForDay(day)] || [] : [];
          return (
            <div className={`calendar-cell ${day ? '' : 'calendar-cell-empty'}`} key={`${day || 'blank'}-${index}`}>
              {day && <div className="calendar-day-number">{day}</div>}
              {dayEntries.map((entry) => (
                <div className="calendar-entry" key={entry.id} title={entry.name}>
                  <strong>{entry.name}</strong>
                  <span>{formatLoggedTime(entry.durationMinutes)}</span>
                  {entry.linkedEntries?.length > 0 && <small>Linked: {entry.linkedEntries.map((item) => item.name).join(', ')}</small>}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
