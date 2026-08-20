import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

// Set these in client/.env:
// VITE_GOOGLE_CLIENT_ID=<the real Google Client ID>
// VITE_API_URL=http://localhost:3000

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

export function useLogin() {
  const navigate = useNavigate();
  const hiddenBtnRef = useRef(null);
  const initializedRef = useRef(false);

  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCredentialResponse = async (response) => {
    setLoading(true);
    setError(null);

    try {
      const idToken = response.credential;

      // Both Sign In and Sign Up use the same backend endpoint.
      // The backend determines whether the user is new or already exists.
      const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error?.message || "Authentication failed"
        );
      }

      // Store the application's JWT session token.
      localStorage.setItem("authToken", data.token);

      // Send the user to the dashboard after successful authentication.
      navigate("/dashboard");
    } catch (err) {
      console.error("Authentication error:", err);

      setError(
        mode === "login"
          ? "Sign-in failed. Please try again."
          : "Sign-up failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initializedRef.current) return;

    if (!window.google) {
      console.warn("Google Identity Services has not loaded.");
      return;
    }

    if (!hiddenBtnRef.current) {
      console.warn("Google login button container is not available.");
      return;
    }

    if (!GOOGLE_CLIENT_ID) {
      console.error("VITE_GOOGLE_CLIENT_ID is not configured.");
      setError("Google authentication is not configured.");
      return;
    }

    initializedRef.current = true;

    // Initialize Google Identity Services only once.
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
    });

    // Render the Google button.
    window.google.accounts.id.renderButton(
      hiddenBtnRef.current,
      {
        type: "standard",
        theme: "outline",
        size: "large",
      }
    );
  }, []);

  return {
    hiddenBtnRef,
    mode,
    setMode,
    loading,
    error,
  };
}
