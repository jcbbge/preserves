// Post processing functionality for the download module
import { PeachPost } from "~/context/peach";
import { fetchStream } from "~/routes/api/stream";
import { debugLog, DEV_MODE } from "./utils";

/**
 * Extract username from JWT token
 */
export function extractUsername(token: string): string | null {
  debugLog("token", "Extracting username from token");

  try {
    // Validate token
    if (!token || typeof token !== "string") {
      console.error("[API] Invalid token provided");
      return null;
    }

    // Log token for debugging
    debugLog("token", "Token structure", {
      length: token.length,
      hasDots: token.includes("."),
      parts: token.split(".").length,
    });

    // If it doesn't look like a JWT token, it might be a direct token
    if (!token.includes(".") || token.split(".").length !== 3) {
      debugLog("token", "Token does not appear to be a standard JWT");
      return null;
    }

    // Extract the payload from the JWT token
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));

    // Log payload structure for debugging
    debugLog("token", "JWT payload keys", Object.keys(payload));

    // The username might be in different fields depending on the token structure
    const username =
      payload.email ||
      payload.username ||
      payload.sub ||
      payload.userID ||
      null;
    debugLog("token", `Extracted username: ${username}`);
    return username;
  } catch (error) {
    console.error("[API] Error extracting username from token:", error);
    return null;
  }
}

/**
 * Fetch posts from Peach API
 */
export async function fetchPosts(
  token: string,
  username?: string,
  devMode: boolean = DEV_MODE,
): Promise<PeachPost[]> {
  debugLog("posts", "Fetching posts from Peach API", {
    hasToken: !!token,
    username,
  });

  try {
    // Use provided username or extract from token
    const userIdentifier = username || extractUsername(token);
    if (!userIdentifier) {
      throw new Error(
        "Unable to determine username. Please provide a username in the options.",
      );
    }

    const isDevMode = devMode;

    debugLog("api", `Fetching posts for user: ${userIdentifier}`);

    // Prepare form data for the request
    const formData = new FormData();
    formData.append("username", userIdentifier);
    formData.append("token", token);

    // COMPARISON DEBUG - Compare the tokens
    if (typeof window !== "undefined") {
      try {
        const savedUserData = localStorage.getItem("auth_user_details");

        if (savedUserData) {
          const userData = JSON.parse(savedUserData);
          const storedStreamToken = userData?.streams?.[0]?.token;

          if (token !== storedStreamToken) {
            console.log("  - TOKENS DIFFERENT! Using wrong token!");

            // CRITICAL FIX - Use the stream token that works
            if (storedStreamToken) {
              formData.delete("token");
              formData.append("token", storedStreamToken);
            }
          }
        }
      } catch (e) {
        console.error("[DEBUG-CRITICAL] Error comparing tokens:", e);
      }
    }

    const response = await fetchStream(formData);

    debugLog("api", "Received API response", {
      success: response.success,
      hasData: !!response.data,
    });

    if (!response.success || !response.data) {
      // We need to see real errors with real data - NEVER use mock data
      debugLog("api", "API call failed - showing full error details");

      // Log the full response for debugging (using console.dir for better object inspection)
      console.dir(response, { depth: null, colors: true });

      // Create an informative error message
      let errorDetails = "Unknown error";
      if (response.error) {
        errorDetails = response.error;
      }

      // Build a comprehensive error message with all available details
      if (response.details) {
        errorDetails += ` - Details: ${response.details}`;
      }

      if (response.errorDetails) {
        console.log("[API] Extended error details:", response.errorDetails);

        // Add information about the potential cause of the error
        if (response.errorDetails.isHtmlResponse) {
          errorDetails +=
            " - API returned HTML instead of JSON (possible auth issue)";
        }

        if (response.errorDetails.isAuthError) {
          errorDetails += " - Possible authentication error detected";
        }

        if (response.errorDetails.errorPosition) {
          errorDetails += ` - JSON parse error at position ${response.errorDetails.errorPosition}`;
        }
      }

      if (response.rawResponseText) {
        // Log with clear markers to make it easy to find in the console
        console.log(
          "[API] ================== RAW RESPONSE TEXT START ==================",
        );
        console.log(response.rawResponseText);
        console.log(
          "[API] ================== RAW RESPONSE TEXT END ==================",
        );

        // Add sample information to the error message
        if (response.responseSample) {
          errorDetails += " - Response sample: " + response.responseSample;
        } else {
          const sampleLength = Math.min(100, response.rawResponseText.length);
          errorDetails += ` - Response starts with: ${response.rawResponseText.substring(0, sampleLength)}...`;
        }
      }

      // Add information about response type/size to help debugging
      if (response.rawResponseLength) {
        errorDetails += ` - Raw response length: ${response.rawResponseLength} bytes`;
      }

      debugLog("api", "Constructed error details", errorDetails);

      throw new Error(`Failed to fetch posts from API: ${errorDetails}`);
    }

    // Additional validation of the response format
    if (
      !response.data?.data?.posts ||
      !Array.isArray(response.data?.data?.posts)
    ) {
      debugLog("api", "API returned unexpected format", response.data);

      if (response.data) {
        console.log("[API] response.data keys:", Object.keys(response.data));
      }

      // Check if posts exists but isn't an array
      if (
        response.data?.data?.posts &&
        !Array.isArray(response.data.data.posts)
      ) {
        console.log(
          "[API] posts exists but is not an array:",
          typeof response.data.data.posts,
        );
        console.log("[API] posts value:", response.data.data.posts);
      }

      // Try to pretty-print the data structure (limited to prevent massive logs)
      try {
        const truncatedData = JSON.stringify(response.data, null, 2).substring(
          0,
          1000,
        );
        console.log(
          "[API] Truncated data structure:",
          truncatedData + (truncatedData.length === 1000 ? "..." : ""),
        );
      } catch (stringifyError) {
        console.log("[API] Could not stringify data:", stringifyError.message);
      }

      // Create a descriptive error message based on what's missing
      let formatError = "API returned unexpected format:";

      if (!response.data) {
        formatError += " No data object in response.";
      } else if (!response.data.data) {
        formatError += " No data.data object in response.";
      } else if (!response.data.data.posts) {
        formatError += " No posts array in response.data.data.";
      } else if (!Array.isArray(response.data.data.posts)) {
        formatError += ` Posts is not an array (type: ${typeof response.data.data.posts}).`;
      }

      throw new Error(formatError + ` Full response logged to console.`);
    }

    const posts = response.data?.data?.posts || [];
    debugLog("api", `Fetched ${posts.length} posts`);

    // In DEV_MODE, we're done - just return the first batch
    if (isDevMode) {
      debugLog("api", "DEV MODE: Limiting to first batch of posts");
      return posts;
    }

    // In production mode, we'd follow cursor for pagination
    // but for now, just return the first batch
    debugLog("api", "Limiting to first batch of posts for simplicity");
    return posts;
  } catch (error) {
    console.error("[API] Error fetching posts:", error);

    // We want to see real errors with real data
    debugLog("api", "API error and mock data disabled - showing real error");
    throw new Error(
      `Failed to retrieve posts from Peach: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
