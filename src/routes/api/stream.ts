import { action, query } from "@solidjs/router";
import { analyzeApiResponse } from "~/lib/api/debug-peach";

// Add a proxy for media URLs to avoid CORS issues
export const mediaProxy = action(async (formData: FormData) => {
  "use server";
  
  const url = formData.get("url") as string;
  
  console.log('[SERVER-PROXY] Proxying media URL:', url);
  
  if (!url) {
    return new Response('URL parameter is required', { status: 400 });
  }
  
  try {
    // Directly fetch the media file
    const response = await fetch(url, {
      method: 'GET',
    });
    
    if (!response.ok) {
      console.error('[SERVER-PROXY] Media fetch error:', response.status, response.statusText);
      return new Response(`Failed to fetch media: ${response.status}`, { status: response.status });
    }
    
    // Get the content type
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Get the response as an array buffer
    const data = await response.arrayBuffer();
    
    // Return the media data with the original content type
    return new Response(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
      }
    });
  } catch (error) {
    console.error('[SERVER-PROXY] Error in media proxy:', error);
    return new Response(`Server error: ${error instanceof Error ? error.message : 'Unknown error'}`, { 
      status: 500 
    });
  }
}, "media-proxy");

export const fetchStream = query(async (formData: FormData) => {
  "use server";
  
  console.log('[SERVER-API] Starting stream fetch');
  
  const username = formData.get("username") as string;
  const token = formData.get("token") as string;
  const cursor = formData.get("cursor") as string | null;
  
  console.log('[SERVER-API] Request params:', { 
    username, 
    tokenPresent: !!token, 
    cursor: cursor || 'null' 
  });

  if (!username || !token) {
    console.error('[SERVER-API] Missing username or token');
    return {
      success: false,
      error: 'Username and token are required'
    };
  }

  try {
    // Build URL with optional cursor
    const url = cursor
      ? `https://v1.peachapi.com/stream/n/${username}?cursor=${cursor}`
      : `https://v1.peachapi.com/stream/n/${username}`;
    
    console.log('[SERVER-API] Requesting URL:', url);
    
    // Make the request server-side (no CORS issues)
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('[SERVER-API] Response status:', response.status, response.statusText);
    
    // Check if the response is OK
    if (!response.ok) {
      console.error('[SERVER-API] Response not OK:', response.status, response.statusText);
      // Try to get the response text for better error reporting
      const responseText = await response.text();
      console.error('[SERVER-API] Error response body:', responseText);
      
      return {
        success: false,
        error: `API returned status ${response.status}: ${response.statusText}`,
        details: responseText
      };
    }
    
    // Get the full raw response text 
    const responseText = await response.text();
    
    // JUST LOG THE RAW RESPONSE - NO PROCESSING
    console.log('======================================================================');
    console.log('================= COMPLETE RAW API RESPONSE START ===================');
    console.log('======================================================================');
    console.log(responseText);
    console.log('======================================================================');
    console.log('================== COMPLETE RAW API RESPONSE END ====================');
    console.log('======================================================================');
    
    // Also create a text file with the response for easier analysis
    try {
      const fs = require('fs');
      fs.writeFileSync('/tmp/peach_api_response.json', responseText);
      console.log('[SERVER-API] Wrote raw response to /tmp/peach_api_response.json');
    } catch (writeError) {
      console.error('[SERVER-API] Could not write response to file:', writeError);
    }
    
    // Try to parse the response after logging the raw version
    try {
      const data = JSON.parse(responseText);
      console.log('[SERVER-API] Successfully parsed JSON response');
      
      // Run detailed analysis on the response structure to debug media issues
      console.log('[SERVER-API] Running detailed media structure analysis:');
      analyzeApiResponse(data);
      
      return {
        success: true,
        data
      };
    } catch (parseError) {
      console.error('[SERVER-API] JSON parse error:', parseError.message);
      return {
        success: false,
        error: `Failed to parse JSON: ${parseError.message}`,
        rawResponseText: responseText
      };
    }
  } catch (error) {
    console.error('[SERVER-API] Error fetching stream:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch stream'
    };
  }
}, "stream");