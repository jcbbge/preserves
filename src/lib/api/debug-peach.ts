/**
 * Debug utilities for Peach API responses
 */

/**
 * Analyzes a post object to find media and log details
 */
export function analyzePostMedia(post: any, index: number = 0): void {
  console.log(`[DEBUG-PEACH] Analyzing post ${index} (ID: ${post.id || 'unknown'}):`);
  
  // Check media array
  if (post.media) {
    console.log(`[DEBUG-PEACH] Post has media array with ${post.media.length} items`);
    post.media.forEach((media: any, i: number) => {
      console.log(`[DEBUG-PEACH] Media item ${i}:`, {
        type: media.type,
        url: media.url ? media.url.substring(0, 50) + '...' : 'no url',
        hasWidth: !!media.width,
        hasHeight: !!media.height
      });
    });
  } else {
    console.log('[DEBUG-PEACH] Post has no media array');
  }
  
  // Check message structure for embedded media
  if (Array.isArray(post.message)) {
    console.log(`[DEBUG-PEACH] Post has message array with ${post.message.length} items`);
    post.message.forEach((msg: any, i: number) => {
      console.log(`[DEBUG-PEACH] Message item ${i}:`, {
        type: msg.type,
        hasText: !!msg.text,
        hasSrc: !!msg.src,
        src: msg.src ? msg.src.substring(0, 50) + '...' : 'no src'
      });
    });
  } else if (typeof post.message === 'string') {
    console.log('[DEBUG-PEACH] Post has string message');
  } else {
    console.log('[DEBUG-PEACH] Post has no message');
  }
  
  // Log any other fields that might contain media
  const interestingFields = Object.keys(post).filter(key => 
    key !== 'media' && key !== 'message' && 
    (typeof post[key] === 'object' || key.toLowerCase().includes('image') || key.toLowerCase().includes('pic'))
  );
  
  if (interestingFields.length > 0) {
    console.log('[DEBUG-PEACH] Other interesting fields that might contain media:', interestingFields);
    interestingFields.forEach(field => {
      console.log(`[DEBUG-PEACH] Field ${field}:`, post[field]);
    });
  }
}

/**
 * Analyzes the response from the Peach API to find media structure
 */
export function analyzeApiResponse(response: any): void {
  console.log('[DEBUG-PEACH] Analyzing API response');
  
  if (!response || typeof response !== 'object') {
    console.log('[DEBUG-PEACH] Invalid response:', response);
    return;
  }
  
  // Log structure
  console.log('[DEBUG-PEACH] Response keys:', Object.keys(response));
  
  if (response.data) {
    console.log('[DEBUG-PEACH] Data keys:', Object.keys(response.data));
    
    if (response.data.data) {
      console.log('[DEBUG-PEACH] Data.data keys:', Object.keys(response.data.data));
      
      if (response.data.data.posts) {
        const posts = response.data.data.posts;
        console.log(`[DEBUG-PEACH] Found ${posts.length} posts`);
        
        // Analyze the first 5 posts in detail
        for (let i = 0; i < Math.min(5, posts.length); i++) {
          analyzePostMedia(posts[i], i);
        }
        
        // Count posts with media
        const postsWithMedia = posts.filter((p: any) => p.media && p.media.length > 0);
        console.log(`[DEBUG-PEACH] Posts with media array: ${postsWithMedia.length} / ${posts.length}`);
        
        // Check for message media
        const postsWithMessageMedia = posts.filter((p: any) => {
          if (!Array.isArray(p.message)) return false;
          return p.message.some((m: any) => m.type === 'image' || m.type === 'video' || m.type === 'gif');
        });
        console.log(`[DEBUG-PEACH] Posts with media in message: ${postsWithMessageMedia.length} / ${posts.length}`);
      }
    }
  }
}