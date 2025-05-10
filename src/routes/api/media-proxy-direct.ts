/**
 * Direct media proxy endpoint - simplified for reliable binary downloads
 * Uses query parameters instead of form data for better reliability
 */
export async function GET({ request }) {
  try {
    // Get the media URL from query parameters
    const url = new URL(request.url);
    const mediaUrl = url.searchParams.get('url');
    
    console.log('[DIRECT-PROXY] Request for URL:', mediaUrl);
    
    if (!mediaUrl) {
      console.error('[DIRECT-PROXY] No URL provided');
      return new Response('URL parameter is required', { status: 400 });
    }
    
    // Log key debugging information
    console.log('[DIRECT-PROXY] Requesting media from:', mediaUrl);
    
    // Fetch the media with specific headers to ensure binary data
    const response = await fetch(mediaUrl, {
      method: 'GET',
      headers: {
        // Use specific media headers to ensure we get binary data, not HTML
        'Accept': 'image/jpeg,image/png,image/gif,image/*,*/*',
        'User-Agent': 'Mozilla/5.0 Peach Preserves Media Downloader',
        // Avoid compression to reduce chance of errors
        'Accept-Encoding': 'identity'
      }
    });
    
    if (!response.ok) {
      console.error('[DIRECT-PROXY] Fetch error:', response.status, response.statusText);
      return new Response(`Failed to fetch media: ${response.status}`, { status: response.status });
    }
    
    // Get content type and check for HTML
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length') || '0';
    
    console.log('[DIRECT-PROXY] Media content type:', contentType);
    console.log('[DIRECT-PROXY] Media content length:', contentLength);
    
    // Reject HTML responses
    if (contentType.includes('text/html') || contentType.includes('xhtml')) {
      console.error('[DIRECT-PROXY] Received HTML instead of media content');
      return new Response('Received HTML instead of media content', { status: 422 });
    }
    
    // Get the raw binary data
    const arrayBuffer = await response.arrayBuffer();
    
    console.log('[DIRECT-PROXY] Downloaded data size:', arrayBuffer.byteLength, 'bytes');
    
    // Return the media with proper headers
    return new Response(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(arrayBuffer.byteLength),
        'Cache-Control': 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('[DIRECT-PROXY] Server error:', error);
    return new Response(`Server error: ${error instanceof Error ? error.message : String(error)}`, { 
      status: 500 
    });
  }
}