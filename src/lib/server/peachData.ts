import { query } from "@solidjs/router";

/**
 * Server function to fetch Peach posts for a specific user.
 * 
 * Handles authentication and returns structured response data
 * for dashboard consumption.
 * 
 * @param username - The Peach username
 * @param token - The authentication token
 * @returns Promise<PeachPostsResponse> Posts data or error
 */
export const getPeachPosts = query(async (username: string, token: string) => {
  "use server";
  
  // Validation
  if (!username || !token) {
    throw new Error("Username and token are required");
  }
  
  try {
    const url = `https://v1.peachapi.com/stream/n/${username}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      console.error(`[SERVER] Peach API error: ${response.status} ${response.statusText}`);
      throw new Error(`API returned status ${response.status}: ${response.statusText}`);
    }
    
    const responseText = await response.text();
    
    try {
      const data = JSON.parse(responseText);
      return {
        success: true,
        data,
      };
    } catch (parseError) {
      console.error("[SERVER] Error parsing Peach API response:", parseError);
      throw new Error("Failed to parse API response");
    }
  } catch (error) {
    console.error(`[SERVER] Error fetching Peach posts for ${username}:`, error);
    throw new Error("Failed to fetch Peach posts");
  }
}, "getPeachPosts");

export interface PeachPostsResponse {
  success: boolean;
  data?: any;
  error?: string;
}