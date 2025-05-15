import { type MiddlewareInput } from "@solidjs/start/server";
import { redirect } from "@solidjs/router";
import { getCookie } from "vinxi/http";

export default async function authMiddleware({ forward, event }: MiddlewareInput) {
  const url = new URL(event.request.url);
  const path = url.pathname;

  // Only protect dashboard route
  if (path === "/dashboard" || path.startsWith("/dashboard/")) {
    // Get auth token using Vinxi cookie helper
    const token = getCookie(event.nativeEvent, "peach_token");
    
    // If no token found, redirect to login
    if (!token) {
      console.log("[MIDDLEWARE] No auth token found, redirecting to login");
      return redirect("/");
    }
    
    // Store auth state in locals for use in components
    event.locals.isAuthenticated = true;
    event.locals.token = token;
  }

  // Continue to next middleware or route handler
  return forward();
}