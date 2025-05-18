import { useNavigate } from "@solidjs/router";

/**
 * Unified function to handle authentication-based redirects
 * @param isAuthenticated Function that checks if user is authenticated
 * @param navigate SolidJS navigate function
 * @param options Configuration options for redirection
 * @returns True if redirection occurred, false otherwise
 */
export function handleAuthRedirect(
  isAuthenticated: () => boolean,
  navigate: ReturnType<typeof useNavigate>,
  options: {
    redirectWhen: "authenticated" | "unauthenticated";
    targetPath?: string;
    delay?: number;
  } = { redirectWhen: "unauthenticated", targetPath: "/", delay: 0 }
) {
  const { redirectWhen, targetPath = redirectWhen === "authenticated" ? "/dashboard" : "/", delay = 0 } = options;

  const shouldRedirect = redirectWhen === "authenticated" ? isAuthenticated() : !isAuthenticated();

  if (shouldRedirect) {
    const statusMsg = redirectWhen === "authenticated"
      ? "User authenticated, redirecting to dashboard"
      : "User not authenticated, redirecting to login";

    console.log(`[AUTH] ${statusMsg}`);
    setTimeout(() => navigate(targetPath), delay);
    return true;
  }
  return false;
}

/**
 * Redirect to dashboard if already authenticated
 * @param isAuthenticated Function that checks if user is authenticated
 * @param navigate SolidJS navigate function
 * @param delay Optional delay in milliseconds before redirection
 */
export function redirectIfAuthenticated(
  isAuthenticated: () => boolean,
  navigate: ReturnType<typeof useNavigate>,
  delay = 0
) {
  return handleAuthRedirect(isAuthenticated, navigate, {
    redirectWhen: "authenticated",
    targetPath: "/dashboard",
    delay
  });
}

/**
 * Redirect to login if not authenticated
 * @param isAuthenticated Function that checks if user is authenticated
 * @param navigate SolidJS navigate function
 * @param delay Optional delay in milliseconds before redirection
 */
export function redirectIfNotAuthenticated(
  isAuthenticated: () => boolean,
  navigate: ReturnType<typeof useNavigate>,
  delay = 0
) {
  return handleAuthRedirect(isAuthenticated, navigate, {
    redirectWhen: "unauthenticated",
    targetPath: "/",
    delay
  });
}