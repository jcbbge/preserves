import { createSignal } from "solid-js";
import { query, useNavigate } from "@solidjs/router";
import { usePeach } from "~/context/peach";

import styles from "./LoginForm.module.css";

// Server action for login - handles API call server-side to avoid CORS
const connect = query(async (formData: FormData) => {
  "use server";

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    console.error("[SERVER] MISSING CREDENTIALS - THIS IS THE PROBLEM");
    return {
      success: false,
      error: "Email and password are required",
    };
  }

  try {
    const requestBody = {
      email: email,
      password: password,
    };

    const response = await fetch("https://v1.peachapi.com/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    // Check for API error response
    if (data.success === 0) {
      console.error("[SERVER] API returned error:", data.error);
      throw new Error(data.error?.Message || "Authentication failed");
    }

    // Log data structure to debug
    console.log("[SERVER] Data keys:", Object.keys(data));
    if (data.data) {
      console.log("[SERVER] data.data keys:", Object.keys(data.data));
    }

    // Get the token from data.data.token
    const authToken = data.data?.token;

    if (!authToken) {
      console.error("[SERVER] Could not find token in response");
      throw new Error("No authentication token in response");
    }

    return {
      success: true,
      token: authToken,
      email,
      userData: data.data,
    };
  } catch (error) {
    console.error("[SERVER] Authentication error with full details:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Authentication failed",
    };
  }
}, "login");

export default function LoginForm() {
  const navigate = useNavigate();
  const { login } = usePeach();
  const [error, setError] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(false);

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.target as HTMLFormElement;
    const formData = new FormData();

    // Get input values directly
    const emailInput = form.querySelector("#email") as HTMLInputElement;
    const passwordInput = form.querySelector("#password") as HTMLInputElement;

    if (emailInput && passwordInput) {
      formData.set("email", emailInput.value);
      formData.set("password", passwordInput.value);
    } else {
      console.error("[CLIENT] COULD NOT FIND FORM INPUTS!");
    }

    try {
      const result = await connect(formData);

      if (result.success && result.token) {
        login(result.token, { ...result.userData, email: result.email });
        navigate("/dashboard");
      } else {
        console.log("[CLIENT] Login failed:", result.error);
        setError(
          result.error ||
            "Failed to connect to Peach. Please check your credentials.",
        );
      }
    } catch (error) {
      console.error("[CLIENT] Unexpected error during login:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      console.log("[CLIENT] Login attempt completed");
      setLoading(false);
    }
  };

  return (
    <div class={styles["login-container"]} style={{ "z-index": 60 }}>
      <div
        class={`${styles.polaroid} ${styles["login-polaroid"]}`}
        style={{ "z-index": 70 }}
      >
        <div
          class={`${styles["polaroid-image-area"]} ${styles["login-image-area"]}`}
        >
          <img
            src="/peachdotcool.png"
            alt="Peach"
            class={styles["login-logo"]}
          />
          <div class={styles["polaroid-grit-overlay"]}></div>
        </div>
        <div class={styles["polaroid-caption"]}>
          <form onSubmit={handleSubmit} class={styles["login-form"]}>
            <div class={styles["input-wrapper"]}>
              <input
                type="text"
                id="email"
                name="email"
                placeholder="email / username"
                required
                disabled={loading()}
                class={styles["handwritten-input"]}
              />
              <input
                type="password"
                id="password"
                name="password"
                placeholder="password"
                required
                disabled={loading()}
                class={styles["handwritten-input"]}
              />
            </div>
            {error() && (
              <div
                class={`${styles["error-message"]} ${styles["polaroid-handwritten"]}`}
              >
                {error()}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Connect button polaroid */}
      <button
        type="submit"
        class={`${styles.polaroid} ${styles["connect-polaroid"]}`}
        style={{ "z-index": 55 }}
        onClick={() =>
          document
            .querySelector("form")
            ?.dispatchEvent(new Event("submit", { cancelable: true }))
        }
        disabled={loading()}
      >
        <div
          class={`${styles["polaroid-image-area"]} ${styles["connect-image-area"]}`}
        >
          <div class={styles["connect-photo"]}>
            {loading() ? "Connecting..." : "Connect"}
          </div>
          <div class={styles["arrow-down-container"]}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
              <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" />
            </svg>
          </div>
          <div class={styles["polaroid-grit-overlay"]}></div>
        </div>
        <div class={styles["polaroid-caption"]}>
          <span
            class={`${styles["polaroid-handwritten"]} ${styles["connect-text"]}`}
          >
            Connect Peach Account
          </span>
        </div>
      </button>
    </div>
  );
}
