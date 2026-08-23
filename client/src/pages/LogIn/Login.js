import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import { useUser } from "../../context/UserContext.jsx";

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID;

const AUTH_API_URL = (
  import.meta.env.VITE_AUTH_API_URL ||
  "http://localhost:5000"
).replace(/\/$/, "");

export function useLogin() {
  const navigate = useNavigate();

  const { refreshUser } = useUser();

  const hiddenBtnRef = useRef(null);

  const initializedRef = useRef(false);

  const [mode, setMode] =
    useState("login");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState(null);

  const handleCredentialResponse =
    async (response) => {
      setLoading(true);
      setError(null);

      try {
        const idToken =
          response.credential;

        const res = await fetch(
          `${AUTH_API_URL}/api/auth/google`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              idToken,
            }),
          },
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data?.error?.message ||
              "Authentication failed",
          );
        }

        if (!data.token) {
          throw new Error(
            "Authentication succeeded but no session token was returned.",
          );
        }

        /*
         * Store our application's JWT.
         */
        localStorage.setItem(
          "authToken",
          data.token,
        );

        /*
         * UserProvider originally checked for
         * a user before we were logged in.
         *
         * Now that a JWT exists, force it to
         * load /api/auth/me again.
         */
        await refreshUser();

        navigate("/dashboard");
      } catch (err) {
        console.error(
          "Authentication error:",
          err,
        );

        setError(
          mode === "login"
            ? "Sign-in failed. Please try again."
            : "Sign-up failed. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    if (!window.google) {
      console.warn(
        "Google Identity Services has not loaded.",
      );

      return;
    }

    if (!hiddenBtnRef.current) {
      console.warn(
        "Google login button container is not available.",
      );

      return;
    }

    if (!GOOGLE_CLIENT_ID) {
      console.error(
        "VITE_GOOGLE_CLIENT_ID is not configured.",
      );

      setError(
        "Google authentication is not configured.",
      );

      return;
    }

    initializedRef.current = true;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback:
        handleCredentialResponse,
    });

    window.google.accounts.id.renderButton(
      hiddenBtnRef.current,
      {
        type: "standard",
        theme: "outline",
        size: "large",
      },
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
