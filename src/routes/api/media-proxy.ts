/**
 * Direct media proxy endpoint - simplified for reliable binary downloads
 * Uses query parameters instead of form data for better reliability
 */
export async function GET({ request }) {
  try {
    // Get the media URL from query parameters
    const url = new URL(request.url);
    const mediaUrl = url.searchParams.get('url');

    if (!mediaUrl) {
      return new Response('URL parameter is required', { status: 400 });
    }

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
      return new Response(`Failed to fetch media: ${response.status}`, { status: response.status });
    }

    // Get content type and check for HTML
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // Reject HTML responses
    if (contentType.includes('text/html') || contentType.includes('xhtml')) {
      return new Response('Received HTML instead of media content', { status: 422 });
    }

    // Get the raw binary data
    const arrayBuffer = await response.arrayBuffer();

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
    return new Response(`Server error: ${error instanceof Error ? error.message : String(error)}`, {
      status: 500
    });
  }
}