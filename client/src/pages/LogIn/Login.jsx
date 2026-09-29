import { useLogin } from "./Login";

export default function Login() {
  const {
    hiddenBtnRef,
    mode,
    setMode,
    loading,
    error,
  } = useLogin();

  const isLogin = mode === "login";

  return (
    <div className="login-root">
      <div className="login-left">
        <div className="login-deco" aria-hidden="true">
          <span
            className="login-deco-item login-deco-sway"
            style={{ top: "17%", right: "9%", "--r": "-8deg" }}
          >
            <IconNotebook />
          </span>

          <span
            className="login-deco-item login-deco-float"
            style={{ top: "33%", right: "24%", "--r": "34deg", animationDelay: "1.2s" }}
          >
            <IconPencil />
          </span>

          <span
            className="login-deco-item login-deco-drift"
            style={{ top: "50%", right: "7%", "--r": "12deg", animationDelay: "0.6s" }}
          >
            <IconPaperclip />
          </span>

          <span
            className="login-deco-item login-deco-float"
            style={{ bottom: "24%", right: "15%", "--r": "-22deg", animationDelay: "2s" }}
          >
            <IconRuler />
          </span>

          <span
            className="login-deco-item login-deco-sway"
            style={{ bottom: "11%", right: "38%", "--r": "5deg", animationDelay: "1.6s" }}
          >
            <IconEraser />
          </span>

          <span
            className="login-deco-item login-deco-drift"
            style={{ bottom: "36%", left: "5%", "--r": "7deg", animationDelay: "2.6s" }}
          >
            <IconStickyNote />
          </span>
        </div>

        <div className="login-left-inner">
          <div className="login-brand">
            <div className="login-logo-mark">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect
                  width="32"
                  height="32"
                  rx="8"
                  fill="#4f63d2"
                />
                <rect
                  x="8"
                  y="9"
                  width="16"
                  height="2"
                  rx="1"
                  fill="white"
                />
                <rect
                  x="8"
                  y="14"
                  width="12"
                  height="2"
                  rx="1"
                  fill="white"
                  opacity="0.7"
                />
                <rect
                  x="8"
                  y="19"
                  width="10"
                  height="2"
                  rx="1"
                  fill="white"
                  opacity="0.45"
                />
              </svg>
            </div>

            <span className="login-brand-name">
              Digital Logbook
            </span>
          </div>

          <div className="login-tagline-block">
            <h1 className="login-tagline">
              Your work,
              <br />
              <em>documented.</em>
            </h1>

            <p className="login-sub">
              Track projects, log hours, and build a complete
              record of your university journey — all in one place.
            </p>
          </div>

          <div className="login-features">
            <div className="login-feature-item">
              <span className="login-feature-dot" />
              <span>Organise projects and entries</span>
            </div>

            <div className="login-feature-item">
              <span className="login-feature-dot" />
              <span>Track time and progress</span>
            </div>

            <div className="login-feature-item">
              <span className="login-feature-dot" />
              <span>Review your growth over time</span>
            </div>
          </div>
        </div>

        <div className="login-left-footer">
          © 2026 Digital Logbook
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">

          <div className="login-card-header">
            <h2 className="login-card-title">
              {isLogin ? "Welcome back" : "Create your account"}
            </h2>

            <p className="login-card-desc">
              {isLogin
                ? "Sign in with your university Google account to continue."
                : "Create your Digital Logbook account using your university Google account."}
            </p>
          </div>

          {/* LOGIN / SIGNUP SWITCH */}

          <div className="login-mode-switch">
            <button
              type="button"
              className={isLogin ? "mode-active" : ""}
              onClick={() => setMode("login")}
            >
              Sign In
            </button>

            <button
              type="button"
              className={!isLogin ? "mode-active" : ""}
              onClick={() => setMode("signup")}
            >
              Sign Up
            </button>
          </div>

          <div className="login-divider-label">
            <span>
              {isLogin
                ? "Sign in to continue"
                : "Sign up to continue"}
            </span>
          </div>

          <div className="login-google-btn-wrap">
            <button
              className="login-google-btn"
              type="button"
              tabIndex={-1}
            >
              <GoogleIcon />
              <span>
                {isLogin
                  ? "Continue with Google"
                  : "Sign up with Google"}
              </span>
            </button>

            <div
              ref={hiddenBtnRef}
              className="login-google-btn-real"
            />
          </div>

          {loading && (
            <p className="login-status">
              {isLogin
                ? "Signing you in…"
                : "Creating your account…"}
            </p>
          )}

          {error && (
            <p className="login-error">
              {error}
            </p>
          )}

          <p className="login-terms">
            By continuing, you agree to our{" "}
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>

      <style>{`
        .login-root {
          display: flex;
          min-height: 100vh;
          background: #f8fafc;
        }

        .login-left {
          width: 420px;
          flex-shrink: 0;
          background: linear-gradient(165deg, #1e2a4d 0%, #1a2340 46%, #141b33 100%);
          display: flex;
          flex-direction: column;
          padding: 48px 48px 36px;
          position: relative;
          overflow: hidden;
        }

        .login-left::before {
          content: '';
          position: absolute;
          top: -180px;
          right: -160px;
          width: 460px;
          height: 460px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(123, 143, 232, 0.16) 0%, rgba(123, 143, 232, 0) 68%);
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

        .login-deco {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }

        .login-deco-item {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.13);
          transform: rotate(var(--r, 0deg));
          will-change: transform;
        }

        .login-deco-item svg {
          display: block;
        }

        .login-deco-float { animation: loginFloat 9s ease-in-out infinite; }
        .login-deco-drift { animation: loginDrift 12s ease-in-out infinite; }
        .login-deco-sway { animation: loginSway 10s ease-in-out infinite; }

        @keyframes loginFloat {
          0%, 100% { transform: rotate(var(--r, 0deg)) translateY(0); }
          50% { transform: rotate(var(--r, 0deg)) translateY(-9px); }
        }

        @keyframes loginDrift {
          0%, 100% { transform: rotate(var(--r, 0deg)) translate(0, 0); }
          33% { transform: rotate(var(--r, 0deg)) translate(5px, -6px); }
          66% { transform: rotate(var(--r, 0deg)) translate(-4px, 4px); }
        }

        @keyframes loginSway {
          0%, 100% { transform: rotate(calc(var(--r, 0deg) - 2.5deg)); }
          50% { transform: rotate(calc(var(--r, 0deg) + 2.5deg)); }
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
          background: #7b8fe8;
          box-shadow: 0 0 0 3px rgba(123, 143, 232, 0.16);
        }

        .login-left-footer {
          font-size: 12px;
          color: rgba(255,255,255,0.28);
          position: relative;
          z-index: 1;
        }

        .login-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          position: relative;
          overflow: hidden;
        }

        .login-right::before {
          content: '';
          position: absolute;
          bottom: -220px;
          left: -140px;
          width: 520px;
          height: 520px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(79, 99, 210, 0.06) 0%, rgba(79, 99, 210, 0) 70%);
          pointer-events: none;
        }

        .login-card {
          width: 100%;
          max-width: 400px;
          background: #ffffff;
          border-radius: 16px;
          padding: 44px 40px;
          border: 1px solid #e9edf5;
          box-shadow:
            0 1px 2px rgba(16, 24, 40, 0.04),
            0 12px 40px rgba(16, 24, 40, 0.08);
          position: relative;
          z-index: 1;
        }

        .login-card-header {
          margin-bottom: 24px;
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

        .login-mode-switch {
          display: flex;
          gap: 3px;
          background: #eef1f6;
          border-radius: 10px;
          padding: 3px;
          margin-bottom: 24px;
        }

        .login-mode-switch button {
          flex: 1;
          border: none;
          background: transparent;
          padding: 9px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #64748b;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
        }

        .login-mode-switch button.mode-active {
          background: #ffffff;
          color: #1a2340;
          box-shadow: 0 1px 3px rgba(16, 24, 40, 0.1);
        }

        .login-mode-switch button:focus-visible {
          outline: 2px solid #4f63d2;
          outline-offset: 2px;
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
        }

        .login-divider-label::before,
        .login-divider-label::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e9edf5;
        }

        .login-google-btn-wrap {
          position: relative;
          width: 100%;
        }

        .login-google-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 13px 20px;
          background: #ffffff;
          border: 1.5px solid #d8dee9;
          border-radius: 10px;
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          font-weight: 500;
          color: #1e293b;
          cursor: pointer;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }

        .login-google-btn:hover {
          border-color: #b7c2d8;
          background: #fbfcfe;
          box-shadow: 0 2px 8px rgba(16, 24, 40, 0.07);
        }

        .login-google-btn-real {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          overflow: hidden;
        }

        .login-status {
          margin: 14px 0 0;
          font-size: 13px;
          color: #64748b;
          text-align: center;
        }

        .login-error {
          margin: 14px 0 0;
          font-size: 13px;
          color: #dc2626;
          text-align: center;
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
          transition: color 0.15s ease;
        }

        .login-terms a:hover {
          color: #4f63d2;
        }

        @media (max-width: 768px) {
          .login-root {
            flex-direction: column;
          }

          .login-left {
            width: 100%;
            padding: 36px 28px 28px;
          }

          .login-deco {
            display: none;
          }

          .login-tagline {
            font-size: 32px;
          }

          .login-features,
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

        @media (prefers-reduced-motion: reduce) {
          .login-deco-item {
            animation: none;
          }

          .login-mode-switch button,
          .login-google-btn,
          .login-terms a {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 .957 13.038l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 6.294C4.672 4.169 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

function IconPencil() {
  return (
    <svg width="54" height="54" viewBox="0 0 54 54" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 44l2.6-8.4L38.2 9.9a3.4 3.4 0 0 1 4.8 0l1.1 1.1a3.4 3.4 0 0 1 0 4.8L18.4 42.4 10 44z" />
      <path d="M33.5 14.6l5.9 5.9" />
      <path d="M10 44l4.2-1.4" opacity="0.6" />
    </svg>
  );
}

function IconNotebook() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="10" y="6" width="32" height="40" rx="3.5" />
      <path d="M17 6v40" opacity="0.7" />
      <path d="M23 16h12M23 24h12M23 32h8" opacity="0.7" />
      <path d="M6 13h6M6 26h6M6 39h6" opacity="0.9" />
    </svg>
  );
}

function IconRuler() {
  return (
    <svg width="96" height="34" viewBox="0 0 96 34" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="9" width="90" height="16" rx="3" />
      <path d="M15 9v7M25 9v5M35 9v7M45 9v5M55 9v7M65 9v5M75 9v7" opacity="0.8" />
    </svg>
  );
}

function IconPaperclip() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.5 10.5l-8.6 8.6a3.2 3.2 0 0 0 4.5 4.5l8.6-8.6a6.2 6.2 0 0 0-8.8-8.8l-8.6 8.6a9.2 9.2 0 0 0 13 13l8.3-8.3" />
    </svg>
  );
}

function IconEraser() {
  return (
    <svg width="46" height="46" viewBox="0 0 46 46" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 34l-8.6-8.6a2.5 2.5 0 0 1 0-3.5L24.3 6a2.5 2.5 0 0 1 3.5 0l8.6 8.6a2.5 2.5 0 0 1 0 3.5L25 29.5" />
      <path d="M12 29.5L25 29.5" opacity="0.7" />
      <path d="M10 39h26" opacity="0.9" />
    </svg>
  );
}

function IconStickyNote() {
  return (
    <svg width="50" height="50" viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 8h24l6 7v24a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" />
      <path d="M34 8v7h7" />
      <path d="M17 22h16M17 29h16M17 36h9" opacity="0.7" />
    </svg>
  );
}
