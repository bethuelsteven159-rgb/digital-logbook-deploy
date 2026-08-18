import { useState } from "react";
import Sidebar from "../../components/Sidebar";
export default function Stats() {
    const [collapsed, setCollapsed] = useState(false);
    return (<div className="stats-shell">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)}/>
      <main className="stats-main">
        <header className="stats-header">
          <div>
            <p className="stats-eyebrow">Statistics</p>
            <h1 className="stats-title">Your progress</h1>
            <p className="stats-subtitle">See how your projects, entries and logged time develop over time.</p>
          </div>
        </header>

        <div className="stats-content">
          <div className="stats-summary-grid">
            <SummaryCard label="Total time" value="—" icon={<IconClock />}/>
            <SummaryCard label="Projects" value="—" icon={<IconFolder />}/>
            <SummaryCard label="Entries" value="—" icon={<IconEntry />}/>
          </div>

          <section className="stats-panel">
            <div className="stats-panel-heading"><h2>Activity overview</h2><span>Coming from your logbook</span></div>
            <div className="stats-empty">
              <div className="stats-empty-icon"><IconChart /></div>
              <h3>Nothing to show yet.</h3>
              <p>Create your first project to start tracking your progress.</p>
            </div>
          </section>

          <div className="stats-detail-grid">
            <StatPlaceholder title="Project statistics" text="Project totals and progress will appear here once project data exists." icon={<IconFolder />}/>
            <StatPlaceholder title="Entry statistics" text="Entry counts, durations and activity patterns will appear here once you log entries." icon={<IconEntry />}/>
          </div>
        </div>
      </main>
      <style>{`
        .stats-shell{display:flex;min-height:100vh;background:#f8fafc}.stats-main{flex:1;min-width:0;overflow-x:hidden}.stats-header{padding:32px 40px 0}.stats-eyebrow{margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8}.stats-title{margin:0;color:#1a2340;font:400 30px 'DM Serif Display',Georgia,serif}.stats-subtitle{margin:8px 0 0;max-width:650px;color:#64748b;font-size:14px;line-height:1.6}.stats-content{padding:28px 40px 48px;display:flex;flex-direction:column;gap:18px}.stats-summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.stats-summary-card,.stats-panel,.stats-detail-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px}.stats-summary-card{padding:20px}.stats-summary-top{display:flex;align-items:center;justify-content:space-between}.stats-summary-label{font-size:13px;font-weight:500;color:#64748b}.stats-summary-icon{width:32px;height:32px;border-radius:8px;background:#f1f5f9;color:#64748b;display:flex;align-items:center;justify-content:center}.stats-summary-value{margin-top:18px;color:#1a2340;font:400 34px/1 'DM Serif Display',Georgia,serif}.stats-panel{min-height:300px}.stats-panel-heading{display:flex;align-items:center;justify-content:space-between;padding:20px 22px;border-bottom:1px solid #eef2f7}.stats-panel-heading h2,.stats-detail-card h2{margin:0;color:#1a2340;font:400 20px 'DM Serif Display',Georgia,serif}.stats-panel-heading span{font-size:12px;color:#94a3b8}.stats-empty{min-height:240px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px}.stats-empty-icon{width:52px;height:52px;border-radius:50%;background:#f1f5f9;color:#94a3b8;display:flex;align-items:center;justify-content:center;margin-bottom:14px}.stats-empty h3{margin:0;color:#334155;font:500 16px Inter,system-ui,sans-serif}.stats-empty p{margin:7px 0 0;color:#94a3b8;font-size:13px}.stats-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.stats-detail-card{padding:22px;min-height:180px}.stats-detail-card-top{display:flex;gap:12px;align-items:center}.stats-detail-icon{width:36px;height:36px;border-radius:9px;background:#eef2ff;color:#4f63d2;display:flex;align-items:center;justify-content:center}.stats-detail-card p{margin:18px 0 0;color:#94a3b8;font-size:13px;line-height:1.6}.stats-detail-empty{margin-top:16px;color:#64748b;font-size:12px}.stats-summary-card svg,.stats-detail-card svg{width:17px;height:17px}.stats-panel svg{width:24px;height:24px}@media(max-width:900px){.stats-header,.stats-content{padding-left:24px;padding-right:24px}}@media(max-width:600px){.stats-header{padding-top:24px}.stats-title{font-size:24px}.stats-summary-grid,.stats-detail-grid{grid-template-columns:1fr}.stats-panel-heading{align-items:flex-start;gap:8px;flex-direction:column}}
      `}</style>
    </div>);
}
function SummaryCard({ label, value, icon }) { return <div className="stats-summary-card"><div className="stats-summary-top"><span className="stats-summary-label">{label}</span><span className="stats-summary-icon">{icon}</span></div><div className="stats-summary-value">{value}</div></div>; }
function StatPlaceholder({ title, text, icon }) { return <section className="stats-detail-card"><div className="stats-detail-card-top"><span className="stats-detail-icon">{icon}</span><h2>{title}</h2></div><p>{text}</p><div className="stats-detail-empty">No data available yet.</div></section>; }
function IconClock() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
function IconFolder() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 7a2 2 0 0 1 2-2h4l2 3h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7z"/></svg>; }
function IconEntry() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/></svg>; }
function IconChart() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="19" x2="20" y2="19"/><line x1="6" y1="16" x2="6" y2="10"/><line x1="11" y1="16" x2="11" y2="5"/><line x1="16" y1="16" x2="16" y2="8"/></svg>; }
