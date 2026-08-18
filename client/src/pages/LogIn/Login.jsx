import { useNavigate } from "react-router-dom";
export default function Login() {
    const navigate = useNavigate();
    return (<div className="login-root">
      <div className="login-left">
        <div className="login-left-inner">
          <div className="login-brand">
            <div className="login-logo-mark">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="#4f63d2"/>
                <rect x="8" y="9" width="16" height="2" rx="1" fill="white"/>
                <rect x="8" y="14" width="12" height="2" rx="1" fill="white" opacity="0.7"/>
                <rect x="8" y="19" width="10" height="2" rx="1" fill="white" opacity="0.45"/>
              </svg>
            </div>
            <span className="login-brand-name">Digital Logbook</span>
          </div>

          <div className="login-tagline-block">
            <h1 className="login-tagline">Your work,<br /><em>documented.</em></h1>
            <p className="login-sub">
              Track projects, log hours, and build a complete record of your university journey — all in one place.
            </p>
          </div>

          <div className="login-features">
            <div className="login-feature-item">
              <span className="login-feature-dot"/>
              <span>Organise projects and entries</span>
            </div>
            <div className="login-feature-item">
              <span className="login-feature-dot"/>
              <span>Track time and progress</span>
            </div>
            <div className="login-feature-item">
              <span className="login-feature-dot"/>
              <span>Review your growth over time</span>
            </div>
          </div>
        </div>

        <div className="login-left-footer">
          <span>© 2026 Digital Logbook</span>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <div className="login-card-header">
            <h2 className="login-card-title">Welcome back</h2>
            <p className="login-card-desc">
              Sign in with your university Google account to continue.
            </p>
          </div>

          <div className="login-divider-label">
            <span>Sign in to continue</span>
          </div>

          <button className="login-google-btn" onClick={() => navigate("/dashboard")} type="button">
            <GoogleIcon />
            <span>Continue with Google</span>
          </button>

          <p className="login-terms">
            By continuing, you agree to our{" "}
            <a href="#" onClick={(e) => e.preventDefault()}>Terms of Service</a>{" "}
            and{" "}
            <a href="#" onClick={(e) => e.preventDefault()}>Privacy Policy</a>.
          </p>
        </div>
      </div>

      <style>{`
        .login-root {
          display: flex;
          min-height: 100vh;
          background: #f8fafc;
        }

        /* LEFT PANEL */
        .login-left {
          width: 420px;
          flex-shrink: 0;
          background: #1a2340;
          display: flex;
          flex-direction: column;
          padding: 48px 48px 36px;
          position: relative;
          overflow: hidden;
        }
        .login-left::after {
          content: '';
          position: absolute;
          top: -80px;
          right: -80px;
          width: 280px;
          height: 280px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(79, 99, 210, 0.18) 0%, transparent 70%);
          pointer-events: none;
        }
        .login-left::before {
          content: '';
          position: absolute;
          bottom: -60px;
          left: -40px;
          width: 240px;
          height: 240px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(79, 99, 210, 0.10) 0%, transparent 70%);
          pointer-events: none;
        }

        .login-left-inner {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 48px;
          position: relative;
          z-index: 1;
        }

        .login-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .login-logo-mark {
          display: flex;
          align-items: center;
        }
        .login-brand-name {
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          font-weight: 600;
          color: rgba(255,255,255,0.92);
          letter-spacing: 0.01em;
        }

        .login-tagline-block {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .login-tagline {
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: 42px;
          font-weight: 400;
          line-height: 1.15;
          color: #ffffff;
          margin: 0;
        }
        .login-tagline em {
          font-style: italic;
          color: #7b8fe8;
        }
        .login-sub {
          font-size: 15px;
          line-height: 1.65;
          color: rgba(255,255,255,0.55);
          margin: 0;
          max-width: 300px;
        }

        .login-features {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .login-feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          color: rgba(255,255,255,0.65);
        }
        .login-feature-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #4f63d2;
          flex-shrink: 0;
        }

        .login-left-footer {
          font-size: 12px;
          color: rgba(255,255,255,0.28);
          position: relative;
          z-index: 1;
        }

        /* RIGHT PANEL */
        .login-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
        }

        .login-card {
          width: 100%;
          max-width: 400px;
          background: #ffffff;
          border-radius: 16px;
          padding: 44px 40px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04);
        }

        .login-card-header {
          margin-bottom: 32px;
        }
        .login-card-title {
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: 28px;
          font-weight: 400;
          color: #1a2340;
          margin: 0 0 10px;
        }
        .login-card-desc {
          font-size: 14px;
          color: #64748b;
          margin: 0;
          line-height: 1.6;
        }

        .login-divider-label {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          font-size: 12px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 500;
        }
        .login-divider-label::before,
        .login-divider-label::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }

        .login-google-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 13px 20px;
          background: #ffffff;
          border: 1.5px solid #d1d5db;
          border-radius: 10px;
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          font-weight: 500;
          color: #1e293b;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .login-google-btn:hover {
          background: #f8fafc;
          border-color: #9ca3af;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .login-google-btn:active {
          background: #f1f5f9;
          box-shadow: none;
        }
        .login-google-btn:focus-visible {
          outline: 2px solid #4f63d2;
          outline-offset: 2px;
        }

        .login-terms {
          margin: 20px 0 0;
          font-size: 12px;
          color: #94a3b8;
          text-align: center;
          line-height: 1.6;
        }
        .login-terms a {
          color: #64748b;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .login-terms a:hover {
          color: #4f63d2;
        }

        /* RESPONSIVE */
        @media (max-width: 768px) {
          .login-root {
            flex-direction: column;
          }
          .login-left {
            width: 100%;
            padding: 36px 28px 28px;
          }
          .login-left-inner {
            gap: 28px;
          }
          .login-tagline {
            font-size: 32px;
          }
          .login-features {
            display: none;
          }
          .login-left-footer {
            display: none;
          }
          .login-right {
            padding: 32px 20px;
          }
          .login-card {
            padding: 32px 24px;
          }
        }

        @media (max-width: 480px) {
          .login-card {
            box-shadow: none;
            border: none;
            padding: 24px 0;
          }
        }
      `}</style>
    </div>);
}
function GoogleIcon() {
    return (<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 6.294C4.672 4.169 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>);
}
