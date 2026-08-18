import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { useState } from "react";
export default function Profile() {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    return (<div className="profile-shell">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)}/>
      <main className="profile-main">
        <header className="profile-header">
          <div>
            <p className="profile-eyebrow">Profile</p>
            <h1 className="profile-title">Your profile</h1>
            <p className="profile-subtitle">Manage the information associated with your Digital Logbook profile.</p>
          </div>
        </header>

        <div className="profile-content">
          <section className="profile-card profile-identity-card">
            <div className="profile-avatar-large" aria-hidden="true"><IconUser /></div>
            <div className="profile-identity-copy">
              <span className="profile-name-placeholder">Your name</span>
              <span className="profile-email-placeholder">Connected Google account</span>
              <span className="profile-note">Your account information will appear here after authentication is connected.</span>
            </div>
          </section>

          <section className="profile-card">
            <div className="profile-card-heading">
              <h2>Bio</h2>
              <p>A short introduction that can be displayed on your profile.</p>
            </div>
            <textarea className="profile-textarea" placeholder="Tell us a little about yourself…" aria-label="Bio"/>
          </section>

          <section className="profile-card">
            <div className="profile-card-heading">
              <h2>Details</h2>
              <p>Some account details will be supplied by Google authentication.</p>
            </div>
            <div className="profile-details-grid">
              <Detail label="Username / display name" value="—" readOnly/>
              <Detail label="Date joined" value="—" readOnly/>
            </div>
          </section>

          <div className="profile-actions">
            <button className="profile-btn profile-btn-secondary" onClick={() => navigate("/dashboard")}>Cancel</button>
            <button className="profile-btn profile-btn-primary" onClick={() => { }}>Save Changes</button>
          </div>
        </div>
      </main>
      <style>{`
        .profile-shell { display:flex; min-height:100vh; background:#f8fafc; }
        .profile-main { flex:1; min-width:0; overflow-x:hidden; }
        .profile-header { padding:32px 40px 0; }
        .profile-eyebrow { margin:0 0 4px; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:.08em; color:#94a3b8; }
        .profile-title { margin:0; color:#1a2340; font-family:'DM Serif Display',Georgia,serif; font-size:30px; font-weight:400; }
        .profile-subtitle { margin:8px 0 0; max-width:650px; color:#64748b; font-size:14px; line-height:1.6; }
        .profile-content { max-width:900px; padding:28px 40px 48px; display:flex; flex-direction:column; gap:18px; }
        .profile-card { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:24px; }
        .profile-identity-card { display:flex; align-items:center; gap:18px; }
        .profile-avatar-large { width:72px; height:72px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; color:#4f63d2; background:#eef2ff; }
        .profile-avatar-large svg { width:30px; height:30px; }
        .profile-identity-copy { display:flex; flex-direction:column; gap:4px; min-width:0; }
        .profile-name-placeholder { color:#1a2340; font-size:18px; font-weight:600; }
        .profile-email-placeholder { color:#64748b; font-size:13px; }
        .profile-note { margin-top:4px; color:#94a3b8; font-size:12px; line-height:1.5; }
        .profile-card-heading { margin-bottom:18px; }
        .profile-card-heading h2 { margin:0; color:#1a2340; font-family:'DM Serif Display',Georgia,serif; font-size:20px; font-weight:400; }
        .profile-card-heading p { margin:5px 0 0; color:#64748b; font-size:13px; line-height:1.5; }
        .profile-textarea { width:100%; min-height:130px; resize:vertical; border:1px solid #e2e8f0; border-radius:8px; padding:12px 14px; font:400 14px/1.5 Inter,system-ui,sans-serif; color:#1e293b; outline:none; background:#fff; }
        .profile-textarea:focus { border-color:#4f63d2; box-shadow:0 0 0 3px rgba(79,99,210,.1); }
        .profile-textarea::placeholder { color:#94a3b8; }
        .profile-details-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        .profile-detail { display:flex; flex-direction:column; gap:7px; }
        .profile-detail-label { font-size:12px; font-weight:600; color:#64748b; }
        .profile-detail-value { min-height:42px; display:flex; align-items:center; padding:0 13px; border:1px solid #e2e8f0; border-radius:8px; color:#94a3b8; background:#f8fafc; font-size:14px; }
        .profile-actions { display:flex; justify-content:flex-end; gap:10px; }
        .profile-btn { border:0; border-radius:8px; padding:10px 18px; font:500 14px Inter,system-ui,sans-serif; cursor:pointer; }
        .profile-btn-secondary { background:#fff; color:#475569; border:1px solid #e2e8f0; }
        .profile-btn-primary { background:#4f63d2; color:#fff; }
        .profile-btn-primary:hover { background:#3d50bf; }
        @media (max-width:900px) { .profile-header,.profile-content { padding-left:24px; padding-right:24px; } }
        @media (max-width:600px) { .profile-header { padding-top:24px; } .profile-title { font-size:24px; } .profile-details-grid { grid-template-columns:1fr; } .profile-identity-card { align-items:flex-start; } .profile-actions { justify-content:stretch; } .profile-actions .profile-btn { flex:1; } }
      `}</style>
    </div>);
}
function Detail({ label, value }) {
    return <div className="profile-detail"><span className="profile-detail-label">{label}</span><span className="profile-detail-value">{value}</span></div>;
}
function IconUser() {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
}
