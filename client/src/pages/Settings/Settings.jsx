import { useState } from "react";
import Sidebar from "../../components/Sidebar";
export default function Settings() {
    const [collapsed, setCollapsed] = useState(false);
    return (<div className="settings-shell">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)}/>
      <main className="settings-main">
        <header className="settings-header">
          <p className="settings-eyebrow">Settings</p>
          <h1 className="settings-title">Settings</h1>
        </header>
        <section className="settings-card">
          <div className="settings-icon"><IconGear /></div>
          <h2>Still in progress</h2>
          <p>Settings and account preferences will be available soon.</p>
          <span className="settings-badge">Available soon</span>
        </section>
      </main>
      <style>{`
        .settings-shell{display:flex;min-height:100vh;background:#f8fafc}.settings-main{flex:1;min-width:0;display:flex;flex-direction:column}.settings-header{padding:32px 40px 0}.settings-eyebrow{margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8}.settings-title{margin:0;color:#1a2340;font:400 30px 'DM Serif Display',Georgia,serif}.settings-card{width:min(560px,calc(100% - 80px));margin:80px auto 0;padding:48px 36px;text-align:center;background:#fff;border:1px solid #e2e8f0;border-radius:14px}.settings-icon{width:56px;height:56px;border-radius:50%;margin:0 auto 18px;background:#eef2ff;color:#4f63d2;display:flex;align-items:center;justify-content:center}.settings-icon svg{width:25px;height:25px}.settings-card h2{margin:0;color:#1a2340;font:400 24px 'DM Serif Display',Georgia,serif}.settings-card p{margin:10px auto 18px;max-width:390px;color:#64748b;font-size:14px;line-height:1.6}.settings-badge{display:inline-flex;padding:6px 10px;border-radius:999px;background:#f1f5f9;color:#64748b;font-size:12px;font-weight:600}@media(max-width:900px){.settings-header{padding-left:24px;padding-right:24px}.settings-card{width:calc(100% - 48px);margin-top:60px}}@media(max-width:600px){.settings-header{padding-top:24px}.settings-title{font-size:24px}.settings-card{padding:38px 24px}}
      `}</style>
    </div>);
}
function IconGear() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.41 1.41-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20h-2v-.49a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.41-1.41.06-.06A1.7 1.7 0 0 0 9.4 15a1.7 1.7 0 0 0-1.56-1.03H7.35v-2h.49A1.7 1.7 0 0 0 9.4 10a1.7 1.7 0 0 0-.34-1.88L9 8.06l1.41-1.41.06.06A1.7 1.7 0 0 0 12.35 7a1.7 1.7 0 0 0 1.03-1.56V5h2v.44A1.7 1.7 0 0 0 16.41 7a1.7 1.7 0 0 0 1.88-.34l.06-.06 1.41 1.41-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.03h.49v2h-.49A1.7 1.7 0 0 0 19.4 15Z"/></svg>; }
