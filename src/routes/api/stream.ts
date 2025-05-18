import { query } from "@solidjs/router";

export const fetchStream = query(async (formData: FormData) => {
  "use server";

  const username = formData.get("username") as string;
  const token = formData.get("token") as string;
  const cursor = formData.get("cursor") as string | null;

  if (!username || !token) {
    console.error("[SERVER-API] Missing username or token");
    return {
      success: false,
      error: "Username and token are required",
    };
  }

  try {
    // Build URL with optional cursor
    const url = cursor
      ? `https://v1.peachapi.com/stream/n/${username}?cursor=${cursor}`
      : `https://v1.peachapi.com/stream/n/${username}`;

    // Make the request server-side (no CORS issues)
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    // Check if the response is OK
    if (!response.ok) {
      console.error(
        "[SERVER-API] Response not OK:",
        response.status,
        response.statusText,
      );
      // Try to get the response text for better error reporting
      const responseText = await response.text();
      console.error("[SERVER-API] Error response body:", responseText);

      return {
        success: false,
        error: `API returned status ${response.status}: ${response.statusText}`,
        details: responseText,
      };
    }

    // Get the full raw response text
    const responseText = await response.text();

    // Parse the response directly

    // Try to parse the response
    try {
      const data = JSON.parse(responseText);

      return {
        success: true,
        data,
      };
    } catch (parseError) {
      console.error("[SERVER-API] JSON parse error:", parseError.message);
      return {
        success: false,
        error: `Failed to parse JSON: ${parseError.message}`,
        rawResponseText: responseText,
      };
    }
  } catch (error) {
    console.error("[SERVER-API] Error fetching stream:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch stream",
    };
  }
}, "stream");
