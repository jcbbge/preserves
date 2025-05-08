import { query } from "@solidjs/router";

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

    console.log('[SERVER-API] Response status:', response.status);
    
    const data = await response.json();
    console.log('[SERVER-API] Response received');
    
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('[SERVER-API] Error fetching stream:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch stream'
    };
  }
}, "stream");