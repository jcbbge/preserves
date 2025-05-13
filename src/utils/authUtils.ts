import { useNavigate } from "@solidjs/router";

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
  if (isAuthenticated()) {
    console.log("[AUTH] User authenticated, redirecting to dashboard");
    setTimeout(() => navigate("/dashboard"), delay);
    return true;
  }
  return false;
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
  if (!isAuthenticated()) {
    console.log("[AUTH] User not authenticated, redirecting to login");
    setTimeout(() => navigate("/"), delay);
    return true;
  }
  return false;
}