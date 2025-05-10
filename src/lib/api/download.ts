// API client for downloading and archiving Peach data
import JSZip from 'jszip';
import { PeachPost } from '~/context/peach';
import { fetchStream } from '~/routes/api/stream';
import { useExport } from '~/context/export';

// Set this to true to limit the number of posts retrieved (for development/testing)
export const DEV_MODE = true;

// Enable verbose debug logging
export const DEBUG = true;

// NEVER use mock data - we need real responses
export const USE_MOCK_DATA_FALLBACK = false;

function debugLog(section: string, message: string, data?: any) {
  if (!DEBUG) return;
  
  console.group(`🐛 DEBUG [${section}]`);
  console.log(message);
  if (data !== undefined) {
    console.log('DATA:', data);
  }
  console.groupEnd();
}

export interface DownloadOptions {
  includeComments?: boolean;
  includeImages?: boolean;
  username?: string; // Add username option to avoid JWT parsing issues
  devMode?: boolean; // Override DEV_MODE for specific calls
}

interface ArchiveMetadata {
  username: string;
  exportDate: string;
  postCount: number;
  mediaCount: number;
  totalSize: number;
}

interface ArchivePost extends PeachPost {
  localMediaPaths?: string[]; // Paths to media files within the archive
}

interface PeachArchive {
  metadata: ArchiveMetadata;
  posts: ArchivePost[];
}

// Global reference to the export context state updater
let updateExportProgress: (
  update: Partial<{ 
    percentage: number; 
    currentActivity: string;
    phase: 'discovery' | 'content' | 'media' | 'packaging';
    completedItems: number;
    totalItems: number;
  }>
) => void;

/**
 * Create a downloadable archive of a user's Peach data
 * This implementation:
 * 1. Uses cached posts already loaded in the application
 * 2. Downloads additional media files as needed
 * 3. Packages everything into a structured JSON file
 * 4. Creates a ZIP file with all content
 * 5. Triggers the browser download
 */
export async function downloadPeachData(
  token: string, 
  options: DownloadOptions = { includeComments: true, includeImages: true },
  exportContext?: ReturnType<typeof useExport>,
  userData?: any
): Promise<string> {
  debugLog('download', '📥 Starting download process', { 
    hasToken: !!token, 
    options, 
    hasContext: !!exportContext,
    hasUserData: !!userData 
  });
  
  // Setup progress tracking if export context is provided
  if (exportContext) {
    debugLog('context', 'Starting export context', exportContext);
    
    try {
      // Start the export process using the context's startExport function
      await exportContext.startExport();
      
      // Create a helper function to update progress
      updateExportProgress = (update) => {
        if (!exportContext) return;
        
        try {
          // Always use the proper way to update the export context
          if (exportContext.setExportData) {
            debugLog('progress', 'Updating progress', update);
            exportContext.setExportData('progress', prev => ({
              ...prev,
              ...update
            }));
          } else {
            console.error('[API] Cannot update progress - setExportData not available');
          }
        } catch (err) {
          console.error('[API] Error updating progress:', err);
        }
      };
    } catch (err) {
      console.error('[API] Error initializing export context:', err);
      // Create fallback updater
      updateExportProgress = () => {};
    }
  } else {
    // Dummy progress updater if no context is provided
    debugLog('context', 'No export context provided, using dummy updater');
    updateExportProgress = () => {};
  }
  
  try {
    // Step 1: Gather posts
    debugLog('posts', 'Starting post collection');
    updateExportProgress({ 
      phase: 'discovery', 
      percentage: 10,
      currentActivity: 'Connecting to Peach and retrieving your most recent posts...',
      completedItems: 0,
      totalItems: 0 // Will be updated when we know the actual count
    });
    
    // Get username directly from user data
    const username = userData?.username;
    debugLog('user', `Using username: ${username}`);
    
    // Get posts directly from user data or fetch them
    let posts: PeachPost[] = [];
    
    if (userData && userData.streams && userData.streams[0] && userData.streams[0].posts) {
      // Use posts from user data if available
      posts = userData.streams[0].posts;
      debugLog('posts', `Found ${posts.length} posts in user data`);
      
      // In dev mode, limit the number of posts
      const isDevMode = options.devMode !== undefined ? options.devMode : DEV_MODE;
      if (isDevMode) {
        const maxPosts = 10; // Get 10 posts for testing
        if (posts.length > maxPosts) {
          debugLog('dev', `Limiting posts to ${maxPosts} (from ${posts.length})`);
          posts = posts.slice(0, maxPosts);
        }
      }
    } else {
      debugLog('posts', 'No posts in user data, fetching from API or using mock data');
      
      // Fallback to fetching posts from API or mock data
      try {
        posts = await fetchPostsFromAPI(token, username, options);
      } catch (err) {
        console.error('[API] Error fetching posts:', err);
        
        // Only fallback to mock data if explicitly enabled
        if (USE_MOCK_DATA_FALLBACK) {
          debugLog('posts', 'Generating fallback mock posts due to API error');
          posts = generateMockPosts(username || 'user', 10); // Use 10 mock posts
        } else {
          // No mock data fallback - we want to see real errors with real data
          debugLog('posts', 'API error and mock data fallback disabled - showing real error');
          throw new Error(`Failed to fetch posts: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
    
    if (!posts || posts.length === 0) {
      throw new Error('No posts found to archive');
    }
    
    debugLog('posts', `Processing ${posts.length} posts`);
    
    // Update progress with actual post count
    updateExportProgress({ 
      percentage: 30,
      currentActivity: `Found ${posts.length} posts to archive`,
      completedItems: 0, // Starting count
      totalItems: posts.length // Set total based on actual posts
    });
    
    // Step 2: Download media if enabled
    debugLog('media', 'Starting media processing');
    updateExportProgress({ 
      phase: 'media', 
      percentage: 40,
      currentActivity: 'Preparing to download media files...',
      // Keep the completedItems as 0 while starting media phase, but display total posts count
      completedItems: 0,
      totalItems: posts.length
    });
    
    const mediaMap: Record<string, Blob> = {};
    const mediaUrlToPath: Record<string, string> = {};
    
    if (options.includeImages) {
      const mediaUrls = extractMediaUrls(posts);
      debugLog('media', `Found ${mediaUrls.length} media URLs across ${posts.length} posts`);
      
      // Process media in batches to avoid too many progress updates
      const totalPosts = posts.length;
      const postsPerProgress = Math.max(1, Math.floor(totalPosts / 10)); // Update ~10 times during process
      let postCount = 0;
      
      // Update progress to reflect we're processing by post, not by media
      updateExportProgress({ 
        currentActivity: `Processing posts with media (0/${totalPosts})...`,
        percentage: 40,
        totalItems: totalPosts,
        completedItems: 0
      });
      
      // Group media URLs by their post ID for better tracking
      const urlsByPost = new Map();
      posts.forEach((post, postIndex) => {
        const postId = post.id || `post-${postIndex}`;
        const mediaFromPost = extractMediaUrls([post]);
        if (mediaFromPost.length > 0) {
          urlsByPost.set(postId, mediaFromPost);
        }
      });
      
      // Process each post's media
      for (const [postId, postMediaUrls] of urlsByPost.entries()) {
        postCount++;
        
        // Only update progress periodically to avoid flooding the UI
        if (postCount % postsPerProgress === 0 || postCount === totalPosts) {
          updateExportProgress({ 
            currentActivity: `Processing posts with media (${postCount}/${totalPosts})...`,
            percentage: 40 + Math.floor((postCount / totalPosts) * 20),
            completedItems: postCount
          });
        }
        
        // Process all media for this post
        for (let i = 0; i < postMediaUrls.length; i++) {
          const url = postMediaUrls[i];
          // IMPROVED: Include post ID in filename to associate media with specific posts
          const filename = generateMediaFilename(url, i, postId);
          mediaUrlToPath[url] = filename;
          
          try {
            debugLog('media', `Downloading media for post ${postId}: ${url}`);
            const blob = await downloadMedia(url);
            if (blob) {
              mediaMap[filename] = blob;
              debugLog('media', `Downloaded media: ${filename} (${blob.size} bytes)`);
            }
          } catch (err) {
            console.error(`[API] Error with media for post ${postId}:`, err);
            // Continue with next media
          }
        }
      }
      
      // Final update after all posts are processed
      updateExportProgress({ 
        currentActivity: `Processed ${postCount} posts with media`,
        percentage: 60,
        completedItems: totalPosts
      });
    }
    
    // Step 3: Create archive data structure
    debugLog('archive', 'Creating archive data structure');
    updateExportProgress({ 
      phase: 'content', 
      percentage: 70,
      currentActivity: 'Organizing data for archive...',
    });
    
    // Get username from user data or other sources
    const archiveUsername = userData?.username || extractUsername(token) || 'user';
    debugLog('archive', `Using username for archive: ${archiveUsername}`);
    
    let archiveData;
    try {
      archiveData = createArchiveData(archiveUsername, posts, mediaUrlToPath);
      debugLog('archive', 'Archive data created successfully', { 
        postCount: archiveData.posts.length,
        mediaCount: Object.keys(mediaUrlToPath).length 
      });
    } catch (err) {
      console.error('[API] Error creating archive data:', err);
      throw new Error(`Failed to create archive data structure: ${err instanceof Error ? err.message : String(err)}`);
    }
    
    // Step 4: Create and trigger download
    debugLog('zip', 'Starting ZIP creation');
    updateExportProgress({ 
      phase: 'packaging', 
      percentage: 80,
      currentActivity: 'Generating ZIP archive...',
    });
    
    try {
      debugLog('zip', 'Creating JSZip archive with media files', { mediaCount: Object.keys(mediaMap).length });
      const archiveBlob = await createArchive(archiveData, mediaMap);
      
      if (!archiveBlob || archiveBlob.size === 0) {
        throw new Error('Failed to create archive - empty or invalid ZIP file');
      }
      
      debugLog('zip', 'Archive created successfully', { size: archiveBlob.size });
      
      // Generate a filename with timestamp
      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
      const filename = `peach-archive-${archiveUsername}-${timestamp}.zip`;
      
      updateExportProgress({ 
        percentage: 95,
        currentActivity: 'Preparing download...',
      });
      
      // Trigger download
      try {
        debugLog('download', 'Triggering browser download', { filename, size: archiveBlob.size });
        downloadBlob(archiveBlob, filename);
        
        // Only mark as complete after successful download trigger
        debugLog('download', 'Download triggered successfully');
        
        // Complete the export process
        if (exportContext) {
          // First update progress to 100%
          updateExportProgress({ 
            percentage: 100,
            currentActivity: 'Download complete! Archive ready.',
            completedItems: posts.length, // Mark all posts as completed
            totalItems: posts.length,     // Use actual posts count
            phase: 'packaging'            // Make sure we're in the right phase
          });
          
          // Then update the export status using proper method
          if (exportContext.setExportData) {
            debugLog('context', 'Marking export as complete');
            exportContext.setExportData({
              ...exportContext.exportData,
              status: 'complete',
              completedTime: new Date(),
              downloadUrl: filename
            });
          } else {
            console.error('[API] Cannot update status - setExportData not available');
          }
        }
        
        debugLog('download', 'Download process completed successfully');
        return filename;
      } catch (downloadError) {
        console.error('[API] Error triggering download:', downloadError);
        throw new Error(`Failed to start download: ${downloadError instanceof Error ? downloadError.message : String(downloadError)}`);
      }
    } catch (archiveError) {
      console.error('[API] Error creating archive:', archiveError);
      throw new Error(`Failed to generate ZIP archive: ${archiveError instanceof Error ? archiveError.message : String(archiveError)}`);
    }
  } catch (error) {
    console.error('[API] Archive creation error:', error);
    
    // Update export context with error if available
    if (exportContext) {
      // Log the error for debugging
      console.error('[API] Full error details:', error);
      
      // Create the error object
      const errorData = {
        code: 'EXPORT_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create archive',
        retryable: true,
        details: error
      };
      
      debugLog('error', 'Setting export status to error', errorData);
      
      // Update the export status using proper method
      if (exportContext.setExportData) {
        exportContext.setExportData({
          ...exportContext.exportData,
          status: 'error',
          error: errorData
        });
      } else {
        console.error('[API] Cannot update error status - setExportData not available');
      }
    }
    
    throw new Error(`Failed to preserve your Peach data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Fetch posts from the Peach API
 * In DEV_MODE, only fetches the first batch of posts without pagination
 */
/**
 * Generate mock posts for testing
 */
function generateMockPosts(username: string = 'testuser', count: number = 10): PeachPost[] {
  debugLog('mock', `Generating ${count} mock posts for user ${username}`);
  
  const posts: PeachPost[] = [];
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  
  for (let i = 0; i < count; i++) {
    const hasMedia = i % 3 === 0; // Every third post has media
    const mediaCount = hasMedia ? Math.floor(Math.random() * 2) + 1 : 0;
    const mediaItems = [];
    
    for (let j = 0; j < mediaCount; j++) {
      mediaItems.push({
        type: 'image',
        url: `https://picsum.photos/500/300?random=${i * 10 + j}`, // Use Lorem Picsum for random images
        width: 500,
        height: 300
      });
    }
    
    posts.push({
      id: `mock-post-${i}`,
      createdTime: now - (i * 3600), // Posts spread out by hours
      updatedTime: now - (i * 3600),
      message: [{
        type: 'text',
        text: `This is mock post #${i} for testing the download functionality. It ${hasMedia ? 'has' : 'does not have'} media attached.`
      }],
      media: mediaItems,
      isUnread: false,
      commentCount: Math.floor(Math.random() * 5),
      likeCount: Math.floor(Math.random() * 10),
      isLiked: Math.random() > 0.5,
      commentsPreview: []
    });
  }
  
  debugLog('mock', `Generated ${posts.length} mock posts`);
  return posts;
}

/**
 * Fetch posts from the Peach API
 * In DEV_MODE, only fetches the first batch of posts without pagination
 */
async function fetchPostsFromAPI(
  token: string, 
  username?: string, 
  options?: DownloadOptions
): Promise<PeachPost[]> {
  debugLog('api', 'Fetching posts from API', { username });
  
  try {
    // CRITICAL DEBUGGING - What are we receiving as parameters?
    console.log('[DEBUG-CRITICAL] FETCH POSTS - TOKEN PROVIDED:', token ? 'YES' : 'NO');
    console.log('[DEBUG-CRITICAL] FETCH POSTS - TOKEN TYPE:', typeof token);
    console.log('[DEBUG-CRITICAL] FETCH POSTS - TOKEN LENGTH:', token?.length || 0);
    console.log('[DEBUG-CRITICAL] FETCH POSTS - TOKEN PREVIEW:', token?.substring(0, 20) + '...');
    console.log('[DEBUG-CRITICAL] FETCH POSTS - USERNAME:', username);
    
    // Ensure we have a username
    if (!username) {
      username = extractUsername(token);
      debugLog('api', `Extracted username from token: ${username}`);
    }
    
    if (!username) {
      throw new Error('Could not determine username - please provide username directly');
    }
    
    // Check DEV_MODE setting
    const isDevMode = options?.devMode !== undefined ? options.devMode : DEV_MODE;
    debugLog('api', `API running in ${isDevMode ? 'DEV' : 'PRODUCTION'} mode`);
    
    // Basic form data for the initial request
    const formData = new FormData();
    formData.append('username', username);
    formData.append('token', token);
    
    // COMPARISON DEBUG - Compare the tokens
    if (typeof window !== 'undefined') {
      try {
        const savedUserData = localStorage.getItem('peach_user');
        if (savedUserData) {
          const userData = JSON.parse(savedUserData);
          const storedStreamToken = userData?.streams?.[0]?.token;
          console.log('[DEBUG-CRITICAL] STORED TOKEN COMPARISON:');
          console.log('  - STORED:', storedStreamToken ? 'PRESENT' : 'MISSING');
          console.log('  - PASSED:', token ? 'PRESENT' : 'MISSING');
          console.log('  - MATCH:', token === storedStreamToken ? 'YES' : 'NO');
          if (token !== storedStreamToken) {
            console.log('  - TOKENS DIFFERENT! Using wrong token!');
            
            // CRITICAL FIX - Use the stream token that works
            if (storedStreamToken) {
              console.log('[DEBUG-CRITICAL] SWITCHING TO STORED TOKEN FOR API REQUEST');
              formData.delete('token');
              formData.append('token', storedStreamToken);
            }
          }
        }
      } catch (e) {
        console.error('[DEBUG-CRITICAL] Error comparing tokens:', e);
      }
    }
    
    debugLog('api', 'Sending API request');
    console.log('[DEBUG-CRITICAL] ACTUAL REQUEST TOKEN:', formData.get('token'));
    console.log('[DEBUG-CRITICAL] ACTUAL REQUEST USERNAME:', formData.get('username'));
    const response = await fetchStream(formData);
    
    debugLog('api', 'Received API response', { 
      success: response.success,
      hasData: !!response.data
    });
    
    if (!response.success || !response.data) {
      // We need to see real errors with real data - NEVER use mock data
      debugLog('api', 'API call failed - showing full error details');
      
      // Log the full response for debugging (using console.dir for better object inspection)
      console.log('[API] API CALL FAILED WITH ERROR RESPONSE:');
      console.dir(response, { depth: null, colors: true });
      
      // Create an informative error message
      let errorDetails = 'Unknown error';
      if (response.error) {
        errorDetails = response.error;
      }
      
      // Build a comprehensive error message with all available details
      if (response.details) {
        errorDetails += ` - Details: ${response.details}`;
      }
      
      if (response.errorDetails) {
        console.log('[API] Extended error details:', response.errorDetails);
        
        // Add information about the potential cause of the error
        if (response.errorDetails.isHtmlResponse) {
          errorDetails += ' - API returned HTML instead of JSON (possible auth issue)';
        }
        
        if (response.errorDetails.isAuthError) {
          errorDetails += ' - Possible authentication error detected';
        }
        
        if (response.errorDetails.errorPosition) {
          errorDetails += ` - JSON parse error at position ${response.errorDetails.errorPosition}`;
        }
      }
      
      if (response.rawResponseText) {
        // Log with clear markers to make it easy to find in the console
        console.log('[API] ================== RAW RESPONSE TEXT START ==================');
        console.log(response.rawResponseText);
        console.log('[API] ================== RAW RESPONSE TEXT END ==================');
        
        // Add sample information to the error message
        if (response.responseSample) {
          errorDetails += ' - Response sample: ' + response.responseSample;
        } else {
          const sampleLength = Math.min(100, response.rawResponseText.length);
          errorDetails += ` - Response starts with: ${response.rawResponseText.substring(0, sampleLength)}...`;
        }
      }
      
      // Add information about response type/size to help debugging
      if (response.rawResponseLength) {
        errorDetails += ` - Raw response length: ${response.rawResponseLength} bytes`;
      }
      
      debugLog('api', 'Constructed error details', errorDetails);
      
      throw new Error(`Failed to fetch posts from API: ${errorDetails}`);
    }
    
    // Additional validation of the response format
    if (!response.data?.data?.posts || !Array.isArray(response.data?.data?.posts)) {
      debugLog('api', 'API returned unexpected format', response.data);
      
      // Log the full response structure for detailed analysis
      console.log('[API] UNEXPECTED DATA STRUCTURE ANALYSIS:');
      
      // Check if response.data exists and what type it is
      console.log('[API] response.data type:', response.data ? typeof response.data : 'null/undefined');
      if (response.data) {
        console.log('[API] response.data keys:', Object.keys(response.data));
      }
      
      // Check if response.data.data exists
      if (response.data?.data) {
        console.log('[API] response.data.data type:', typeof response.data.data);
        console.log('[API] response.data.data keys:', Object.keys(response.data.data));
      }
      
      // Check if posts exists but isn't an array
      if (response.data?.data?.posts && !Array.isArray(response.data.data.posts)) {
        console.log('[API] posts exists but is not an array:', typeof response.data.data.posts);
        console.log('[API] posts value:', response.data.data.posts);
      }
      
      // Try to pretty-print the data structure (limited to prevent massive logs)
      try {
        const truncatedData = JSON.stringify(response.data, null, 2).substring(0, 1000);
        console.log('[API] Truncated data structure:', truncatedData + (truncatedData.length === 1000 ? '...' : ''));
      } catch (stringifyError) {
        console.log('[API] Could not stringify data:', stringifyError.message);
      }
      
      // Create a descriptive error message based on what's missing
      let formatError = 'API returned unexpected format:';
      
      if (!response.data) {
        formatError += ' No data object in response.';
      } else if (!response.data.data) {
        formatError += ' No data.data object in response.';
      } else if (!response.data.data.posts) {
        formatError += ' No posts array in response.data.data.';
      } else if (!Array.isArray(response.data.data.posts)) {
        formatError += ` Posts is not an array (type: ${typeof response.data.data.posts}).`;
      }
      
      throw new Error(formatError + ` Full response logged to console.`);
    }
    
    const posts = response.data?.data?.posts || [];
    debugLog('api', `Fetched ${posts.length} posts`);
    
    // In DEV_MODE, we're done - just return the first batch
    if (isDevMode) {
      debugLog('api', 'DEV MODE: Limiting to first batch of posts');
      return posts;
    }
    
    // In production mode, we'd follow cursor for pagination
    // but for now, just return the first batch
    debugLog('api', 'Limiting to first batch of posts for simplicity');
    return posts;
  } catch (error) {
    console.error('[API] Error fetching posts:', error);
    
    // Only use mock data if explicitly enabled
    if (USE_MOCK_DATA_FALLBACK) {
      debugLog('api', 'Error in API call, using mock data fallback');
      return generateMockPosts(username || 'user', 10); // Generate 10 mock posts
    }
    
    // We want to see real errors with real data
    debugLog('api', 'API error and mock data disabled - showing real error');
    throw new Error(`Failed to retrieve posts from Peach: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract username from JWT token
 */
function extractUsername(token: string): string | null {
  debugLog('token', 'Extracting username from token');
  
  try {
    // Validate token
    if (!token || typeof token !== 'string') {
      console.error('[API] Invalid token provided');
      return null;
    }
    
    // Log token for debugging
    debugLog('token', 'Token structure', { 
      length: token.length, 
      hasDots: token.includes('.'),
      parts: token.split('.').length
    });
    
    // If it doesn't look like a JWT token, it might be a direct token
    if (!token.includes('.') || token.split('.').length !== 3) {
      debugLog('token', 'Token does not appear to be a standard JWT');
      return null;
    }
    
    // Extract the payload from the JWT token
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    
    // Log payload structure for debugging
    debugLog('token', 'JWT payload keys', Object.keys(payload));
    
    // The username might be in different fields depending on the token structure
    const username = payload.email || payload.username || payload.sub || payload.userID || null;
    debugLog('token', `Extracted username: ${username}`);
    return username;
  } catch (error) {
    console.error('[API] Error extracting username from token:', error);
    return null;
  }
}

/**
 * Extract media URLs from posts
 * Enhanced to find media in multiple possible locations
 */
function extractMediaUrls(posts: PeachPost[]): string[] {
  debugLog('media', 'Extracting media URLs from posts');
  
  const mediaUrls: string[] = [];
  const uniqueUrls = new Set<string>(); // To prevent duplicates
  
  if (!posts || !Array.isArray(posts)) {
    console.warn('[API] Invalid posts data provided to extractMediaUrls');
    return [];
  }
  
  // Debug: Check what the first few posts look like
  console.log('[DEBUG-MEDIA] First post sample:', JSON.stringify(posts[0], null, 2));
  
  // Log media structure specifically for debugging
  console.log('[DEBUG-MEDIA] Media structure check:');
  const mediaCounts = {
    postsWithMedia: 0,
    postsWithMessageMedia: 0,
    postsWithUrlInText: 0,
    totalMediaItems: 0,
    mediaTypes: {}
  };
  
  // Image URL regex patterns
  const imageUrlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|mp4|mov)(\?[^\s]*)?)/gi;
  const peachMediaRegex = /(https?:\/\/[^\s]+\.(peach\.cool|mxxn\.io|acorn\.mn)[^\s]*)/gi;
  
  posts.forEach((post, index) => {
    if (index < 5) {
      console.log(`[DEBUG-MEDIA] Post ${index} media:`, post.media);
      console.log(`[DEBUG-MEDIA] Post ${index} message structure:`, post.message);
    }
    
    let hasMedia = false;
    
    // METHOD 1: Check for media in the standard media array
    if (post.media && post.media.length > 0) {
      hasMedia = true;
      mediaCounts.postsWithMedia++;
      
      post.media.forEach(media => {
        mediaCounts.totalMediaItems++;
        mediaCounts.mediaTypes[media.type] = (mediaCounts.mediaTypes[media.type] || 0) + 1;
        
        if (media.url && typeof media.url === 'string') {
          if (!uniqueUrls.has(media.url)) {
            uniqueUrls.add(media.url);
            mediaUrls.push(media.url);
            debugLog('media', `Found media URL in post.media: ${media.url.substring(0, 50)}...`);
          }
        } else {
          console.log('[DEBUG-MEDIA] Media object without URL or invalid URL:', media);
        }
      });
    }
    
    // METHOD 2: Check for media in the message structure (some posts have it here)
    if (post.message && Array.isArray(post.message)) {
      for (const messagePart of post.message) {
        // Check for image type messages
        if ((messagePart.type === 'image' || messagePart.type === 'video' || messagePart.type === 'gif') && 
             messagePart.src && typeof messagePart.src === 'string') {
          hasMedia = true;
          mediaCounts.postsWithMessageMedia++;
          
          if (!uniqueUrls.has(messagePart.src)) {
            uniqueUrls.add(messagePart.src);
            mediaUrls.push(messagePart.src);
            debugLog('media', `Found media URL in post.message: ${messagePart.src.substring(0, 50)}...`);
          }
        }
        
        // Check for image URLs embedded in text content
        if (messagePart.type === 'text' && messagePart.text && typeof messagePart.text === 'string') {
          // Extract image URLs from text content
          const urlMatches = [
            ...messagePart.text.matchAll(imageUrlRegex),
            ...messagePart.text.matchAll(peachMediaRegex)
          ];
          
          if (urlMatches.length > 0) {
            hasMedia = true;
            mediaCounts.postsWithUrlInText++;
            
            urlMatches.forEach(match => {
              const url = match[0];
              if (!uniqueUrls.has(url)) {
                uniqueUrls.add(url);
                mediaUrls.push(url);
                debugLog('media', `Found media URL in text content: ${url.substring(0, 50)}...`);
              }
            });
          }
        }
      }
    }
    
    // METHOD 3: Check for simple string messages with URLs
    if (typeof post.message === 'string') {
      // Extract image URLs from string content
      const urlMatches = [
        ...post.message.matchAll(imageUrlRegex),
        ...post.message.matchAll(peachMediaRegex)
      ];
      
      if (urlMatches.length > 0) {
        hasMedia = true;
        mediaCounts.postsWithUrlInText++;
        
        urlMatches.forEach(match => {
          const url = match[0];
          if (!uniqueUrls.has(url)) {
            uniqueUrls.add(url);
            mediaUrls.push(url);
            debugLog('media', `Found media URL in string message: ${url.substring(0, 50)}...`);
          }
        });
      }
    }
    
    if (!hasMedia && index < 10) {
      console.log(`[DEBUG-MEDIA] Post ${index} has no detected media:`, post.id);
    }
  });
  
  console.log('[DEBUG-MEDIA] Media statistics:', mediaCounts);
  debugLog('media', `Extracted ${mediaUrls.length} unique media URLs`);
  return mediaUrls;
}

/**
 * Generate a filename for a media URL that includes post ID for proper association
 */
function generateMediaFilename(url: string, index: number, postId?: string): string {
  try {
    // Ensure index is a valid number
    if (index === undefined || index === null) {
      debugLog('media', `Invalid index for URL ${url}, using 0 as default`);
      index = 0;
    }
    
    // Extract filename from URL
    const urlParts = url.split('/');
    let filename = urlParts[urlParts.length - 1];
    
    // Remove query parameters if any
    filename = filename.split('?')[0];
    
    // Extract file extension
    const extensionMatch = filename.match(/\.(jpg|jpeg|png|gif|mp4|webm)$/i);
    const extension = extensionMatch ? extensionMatch[1].toLowerCase() : 'jpg';
    
    // Generate a consistent filename that includes:
    // 1. post ID (if available) to associate media with specific posts
    // 2. sequential index for uniqueness
    let result;
    if (postId) {
      // Use post ID in the filename to make the association clear
      // Use only the first 8 chars of the ID to keep filenames manageable
      const shortPostId = postId.substring(0, 8);
      const paddedIndex = index.toString().padStart(2, '0');
      result = `post_${shortPostId}_img_${paddedIndex}.${extension}`;
    } else {
      // Fallback to old naming scheme if no post ID
      const paddedIndex = index.toString().padStart(3, '0');
      result = `media_${paddedIndex}.${extension}`;
    }
    
    debugLog('media', `Generated filename for URL: ${result}`);
    return result;
  } catch (error) {
    // If anything goes wrong, create a safe fallback filename
    console.error('[API] Error generating media filename:', error);
    const safeIndex = (typeof index === 'number') ? index : 0;
    const fallbackName = `media_${safeIndex.toString().padStart(3, '0')}.jpg`;
    debugLog('media', `Error generating filename, using fallback: ${fallbackName}`);
    return fallbackName;
  }
}

/**
 * Download a media file as a blob
 * CRITICAL FIX: Complete rewrite with simplified approach that uses our working direct proxy
 */
async function downloadMedia(url: string): Promise<Blob | null> {
  try {
    debugLog('media', `Downloading media from URL: ${url}`);
    
    // Validate URL before attempting fetch
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      console.warn('[API] Invalid media URL:', url);
      return null;
    }
    
    // CONFIRMED WORKING APPROACH: Use our direct server proxy that returns binary data correctly
    try {
      // Create the proxy URL with the media URL as a query parameter
      const proxyUrl = new URL('/api/media-proxy-direct', window.location.origin);
      proxyUrl.searchParams.append('url', url);
      
      console.log('[DEBUG-CRITICAL] Downloading media via direct proxy:', proxyUrl.toString());
      
      // Use XMLHttpRequest for reliable binary data handling
      const blob = await new Promise<Blob>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            // Check if we received HTML instead of an image (should never happen with our fixed proxy)
            const contentType = xhr.getResponseHeader('Content-Type') || '';
            if (contentType.includes('text/html') || contentType.includes('xhtml')) {
              console.error('[DEBUG-CRITICAL] Received HTML instead of media:', contentType);
              reject(new Error(`Received HTML instead of media: ${contentType}`));
              return;
            }
            
            // Verify the response is a valid blob with content
            if (xhr.response instanceof Blob && xhr.response.size > 0) {
              resolve(xhr.response);
            } else {
              reject(new Error('Empty or invalid blob received'));
            }
          } else {
            reject(new Error(`Media download failed with status ${xhr.status}`));
          }
        };
        
        xhr.onerror = function() {
          console.error('[DEBUG-CRITICAL] Network error when downloading media');
          reject(new Error('Network error when downloading media'));
        };
        
        xhr.ontimeout = function() {
          console.error('[DEBUG-CRITICAL] Timeout when downloading media');
          reject(new Error('Timeout when downloading media'));
        };
        
        xhr.open('GET', proxyUrl.toString(), true);
        xhr.responseType = 'blob';
        xhr.timeout = 30000; // 30 second timeout for large files
        
        xhr.send();
      });
      
      if (blob.size === 0) {
        throw new Error('Empty blob received');
      }
      
      // Log success details
      debugLog('media', `Downloaded media: ${blob.size} bytes, type: ${blob.type}`);
      
      return blob;
    } catch (error) {
      console.error('[DEBUG-CRITICAL] Media download error:', error);
      return null;
    }
  } catch (error) {
    console.error('[API] Media download error:', error);
    return null;
  }
}

/**
 * Create a placeholder image for media
 * This creates an attractive SVG placeholder
 */
function createPlaceholderImage(errorText: string): Blob {
  debugLog('media', `Creating placeholder image: ${errorText}`);
  
  // Create a more visually appealing SVG with a peach-themed design
  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
      <defs>
        <linearGradient id="peachGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ff98a8" />
          <stop offset="100%" stop-color="#7956b3" />
        </linearGradient>
      </defs>
      <rect width="300" height="200" fill="#f9f9f9" rx="8" ry="8" />
      <rect x="10" y="10" width="280" height="180" fill="url(#peachGradient)" opacity="0.1" rx="4" ry="4" />
      <circle cx="150" cy="80" r="30" fill="#ff98a8" opacity="0.6" />
      <text x="50%" y="140" font-family="Arial" font-size="16" text-anchor="middle" fill="#555">
        Peach Media Placeholder
      </text>
      <text x="50%" y="160" font-family="Arial" font-size="12" text-anchor="middle" fill="#777">
        ${errorText}
      </text>
    </svg>
  `;
  
  // Convert to Blob
  return new Blob([svgContent], { type: 'image/svg+xml' });
}

/**
 * Create the archive data structure
 */
function createArchiveData(
  username: string,
  posts: PeachPost[],
  mediaUrlToPath: Record<string, string>
): PeachArchive {
  debugLog('archive', 'Creating archive data structure');
  
  if (!username) {
    console.warn('[API] No username provided for archive, using "unknown"');
    username = 'unknown';
  }
  
  if (!posts || !Array.isArray(posts) || posts.length === 0) {
    console.warn('[API] No posts provided for archive');
  }
  
  const archivePosts: ArchivePost[] = posts.map(post => {
    const archivePost: ArchivePost = { ...post };
    
    // Update media to include local paths
    if (post.media && post.media.length > 0) {
      archivePost.localMediaPaths = post.media
        .map((media, index) => {
          // First try to get the path from the mediaUrlToPath mapping
          if (media.url && mediaUrlToPath[media.url]) {
            return mediaUrlToPath[media.url];
          }
          
          // If no mapping exists, generate a fallback path that includes the post ID
          if (media.url) {
            const url = media.url;
            const ext = url.split('.').pop()?.toLowerCase() || 'jpg';
            
            // Use the same naming scheme as in generateMediaFilename
            if (post.id) {
              const shortPostId = post.id.substring(0, 8);
              return `post_${shortPostId}_img_${String(index).padStart(2, '0')}.${ext}`;
            } else {
              // Legacy fallback
              return `media_${String(index).padStart(3, '0')}.${ext}`;
            }
          }
          
          return null;
        })
        .filter(Boolean) as string[];
      
      debugLog('archive', `Post ${post.id}: Added ${archivePost.localMediaPaths.length} local media paths`);
      
      // IMPORTANT: Add debug log to see exact media path mapping
      if (archivePost.localMediaPaths.length > 0) {
        debugLog('archive', `Media paths for post ${post.id}:`, archivePost.localMediaPaths);
      }
    } else {
      archivePost.localMediaPaths = [];
    }
    
    return archivePost;
  });
  
  const result = {
    metadata: {
      username,
      exportDate: new Date().toISOString(),
      postCount: posts.length,
      mediaCount: Object.keys(mediaUrlToPath).length,
      totalSize: 0 // This will be updated later if needed
    },
    posts: archivePosts
  };
  
  debugLog('archive', 'Archive data created', { 
    username, 
    postCount: posts.length, 
    mediaCount: Object.keys(mediaUrlToPath).length 
  });
  
  return result;
}

/**
 * Create the ZIP archive with all content
 */
async function createArchive(
  archiveData: PeachArchive,
  mediaFiles: Record<string, Blob>
): Promise<Blob> {
  debugLog('zip', 'Creating ZIP archive');
  
  try {
    const zip = new JSZip();
    
    // Add README file
    debugLog('zip', 'Adding README.txt to archive');
    zip.file("README.txt", 
      `Peach Preserves Archive
      Username: ${archiveData.metadata.username}
      Export Date: ${new Date(archiveData.metadata.exportDate).toLocaleString()}
      Total Posts: ${archiveData.metadata.postCount}
      Media Files: ${archiveData.metadata.mediaCount}
      
      This archive was created with Peach Preserves.
      
      MEDIA FILES:
      -----------
      Media files are stored in the /media directory using the naming convention:
      post_[POST_ID]_img_[INDEX].[EXTENSION]
      
      Example: post_9fbd0e3b_img_00.jpg
      
      Each media file is associated with a specific post through this naming pattern.
      The viewer.html file displays the media files alongside their corresponding posts.
      `);
    
    // Add data.json with all post data
    debugLog('zip', 'Adding data.json to archive');
    zip.file("data.json", JSON.stringify(archiveData, null, 2));
    
    // Create media folder and add all media files
    debugLog('zip', `Adding ${Object.keys(mediaFiles).length} media files to archive`);
    const mediaFolder = zip.folder("media");
    if (mediaFolder) {
      Object.entries(mediaFiles).forEach(([filename, blob]) => {
        mediaFolder.file(filename, blob);
      });
    }
    
    // Add single HTML viewer file with everything inlined
    debugLog('zip', 'Adding HTML viewer to archive');
    const viewerHtml = generateViewerHTML(archiveData);
    debugLog('zip', `Generated HTML viewer (${viewerHtml.length} bytes)`);
    
    // Add a debug summary file to help troubleshoot the archive content
    if (DEBUG) {
      // Create a more detailed debug summary to help with troubleshooting
      // Don't rely on external variables that might be out of scope
      const mediaMappingSamples = archiveData.posts
        .filter(p => p.localMediaPaths && p.localMediaPaths.length > 0)
        .flatMap(p => p.localMediaPaths || [])
        .slice(0, 10)
        .map(path => ({ localFilename: path }));

      const debugSummary = {
        metadata: archiveData.metadata,
        totalPosts: archiveData.posts.length,
        postsWithMedia: archiveData.posts.filter(p => p.media && p.media.length > 0).length,
        postsWithLocalPaths: archiveData.posts.filter(p => p.localMediaPaths && p.localMediaPaths.length > 0).length,
        totalMediaFiles: Object.keys(mediaFiles).length,
        // Don't reference possibly out-of-scope variables
        // Include the first 10 media mappings for debugging (from archiveData instead)
        mediaSampleMappings: mediaMappingSamples,
        // Include posts with media but no local paths (this would indicate a problem)
        problemPosts: archiveData.posts
          .filter(p => 
            (p.media && p.media.length > 0) && 
            (!p.localMediaPaths || p.localMediaPaths.length === 0)
          )
          .map(p => ({
            id: p.id,
            mediaCount: p.media?.length || 0,
            mediaUrls: p.media?.map(m => m.url).filter(Boolean) || []
          })),
        // Regular post summary
        postsSummary: archiveData.posts.map(p => ({
          id: p.id,
          createdTime: p.createdTime,
          mediaCount: p.media?.length || 0,
          localMediaPathsCount: p.localMediaPaths?.length || 0,
          localMediaPaths: p.localMediaPaths || [],
          hasMessageText: Array.isArray(p.message) && p.message.some(m => m.type === 'text')
        }))
      };
      zip.file("debug-info.json", JSON.stringify(debugSummary, null, 2));
    }
    
    // Add the HTML viewer
    zip.file("viewer.html", viewerHtml);
    
    // Generate the zip file with progress callback
    debugLog('zip', 'Generating ZIP blob');
    const blob = await zip.generateAsync({ 
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    }, (metadata) => {
      if (metadata.percent) {
        debugLog('zip', `ZIP generation progress: ${Math.round(metadata.percent)}%`);
      }
    });
    
    debugLog('zip', 'ZIP blob generated successfully', { size: blob.size });
    return blob;
  } catch (error) {
    console.error('[API] Error creating ZIP archive:', error);
    throw new Error(`Failed to create ZIP archive: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Trigger a download of a blob
 */
function downloadBlob(blob: Blob, filename: string): void {
  debugLog('download', 'Starting browser download', { filename, size: blob.size });
  
  if (!blob || blob.size === 0) {
    throw new Error('Cannot download empty blob');
  }
  
  try {
    const url = URL.createObjectURL(blob);
    debugLog('download', `Created object URL: ${url}`);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    
    debugLog('download', 'Clicking download link');
    a.click();
    
    // Clean up
    setTimeout(() => {
      try {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        debugLog('download', 'Download link cleanup completed');
      } catch (e) {
        console.warn('[API] Error during download cleanup:', e);
      }
    }, 100);
  } catch (error) {
    console.error('[API] Error triggering download:', error);
    throw new Error(`Failed to trigger browser download: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate HTML for the viewer with inlined CSS and JS
 */
function generateViewerHTML(archiveData: PeachArchive): string {
  debugLog('viewer', 'Generating viewer HTML with inlined CSS and JS');
  
  // Get CSS and JS content (we'll inline them)
  const cssContent = generateViewerCSS();
  const jsContent = generateViewerJS();
  
  // Stringify the archive data to embed it directly in the HTML
  // This makes the viewer completely self-contained
  const archiveDataJson = JSON.stringify(archiveData);
  
  // Base64 encoded Peach logo for offline use
  const peachLogoBase64 = `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`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Peach Archive - ${archiveData.metadata.username}</title>
  <style>
    ${cssContent}
  </style>
</head>
<body>
  <header>
    <div class="logo-container">
      <img src="data:image/png;base64,${peachLogoBase64}" alt="Peach Logo" class="logo">
      <h1>Peach Archive</h1>
    </div>
    <div class="user-info">
      <span class="username">@${archiveData.metadata.username}</span>
      <span class="export-date">Exported: ${new Date(archiveData.metadata.exportDate).toLocaleDateString()}</span>
    </div>
  </header>
  
  <div class="search-bar">
    <div class="search-container">
      <div class="search-field">
        <label for="search-input">Search posts:</label>
        <input type="text" id="search-input" placeholder="Search by content...">
      </div>
      <div class="time-filter">
        <div class="year-filter">
          <label for="year-select">Year:</label>
          <select id="year-select">
            <option value="">All Years</option>
            <!-- Will be populated by JavaScript -->
          </select>
        </div>
        <div class="month-filter">
          <label for="month-select">Month:</label>
          <select id="month-select">
            <option value="">All Months</option>
            <option value="0">January</option>
            <option value="1">February</option>
            <option value="2">March</option>
            <option value="3">April</option>
            <option value="4">May</option>
            <option value="5">June</option>
            <option value="6">July</option>
            <option value="7">August</option>
            <option value="8">September</option>
            <option value="9">October</option>
            <option value="10">November</option>
            <option value="11">December</option>
          </select>
        </div>
      </div>
      <div class="search-buttons">
        <button id="search-btn">Search</button>
        <button id="reset-btn">Reset</button>
      </div>
    </div>
  </div>
  
  <main>
    <div class="stats">
      <div class="stat">
        <span class="stat-value">${archiveData.metadata.postCount}</span>
        <span class="stat-label">Total Posts</span>
      </div>
      <div class="stat">
        <span class="stat-value" id="visible-posts">${archiveData.metadata.postCount}</span>
        <span class="stat-label">Visible Posts</span>
      </div>
      <div class="stat">
        <span class="stat-value" id="emoji-count">-</span>
        <span class="stat-label">Emojis</span>
      </div>
      <div class="stat">
        <span class="stat-value" id="active-days">-</span>
        <span class="stat-label">Active Days</span>
      </div>
    </div>
    
    <div class="fun-stats">
      <h3>Fun Stats</h3>
      <div class="fun-stats-grid">
        <div class="fun-stat" id="top-emojis">
          <h4>Top Emojis</h4>
          <div class="emoji-list">Loading...</div>
        </div>
        <div class="fun-stat" id="word-count">
          <h4>Word Stats</h4>
          <div class="word-stats">Loading...</div>
        </div>
        <div class="fun-stat" id="activity-chart">
          <h4>Activity by Time</h4>
          <div class="activity-data">Loading...</div>
        </div>
      </div>
    </div>
    
    <div class="timeline" id="timeline">
      <!-- Posts will be inserted here by JavaScript -->
      <div class="loading">Loading posts...</div>
    </div>
  </main>
  
  <footer>
    <p>Created with Peach Preserves - © 2025 jcbbge</p>
  </footer>
  
  <!-- Embed the archive data directly in the HTML -->
  <script>
    // This allows the viewer to work completely offline
    const ARCHIVE_DATA_JSON = ${archiveDataJson};
  </script>
  
  <script>
    ${jsContent}
  </script>
</body>
</html>`;
}

/**
 * Generate CSS for the viewer
 */
function generateViewerCSS(): string {
  debugLog('viewer', 'Generating viewer CSS');
  
  return `/* Peach Archive Viewer Styles */
:root {
  --peach-primary: #ff98a8;
  --peach-secondary: #7956b3;
  --peach-accent: #d7c9fb;
  --peach-dark: #333;
  --peach-light: #f9f9f9;
  --radius: 8px;
  --shadow: 0 2px 10px rgba(0,0,0,0.1);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  line-height: 1.6;
  color: var(--peach-dark);
  background-color: var(--peach-light);
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}

header {
  background-color: var(--peach-primary);
  color: white;
  padding: 1.5rem;
  border-radius: var(--radius);
  margin-bottom: 1rem;
  text-align: center;
  box-shadow: var(--shadow);
}

.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
}

.logo {
  width: 40px;
  height: 40px;
  margin-right: 10px;
}

h1 {
  margin: 0;
  font-size: 1.8rem;
}

.user-info {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.9rem;
}

.search-bar {
  background-color: white;
  border-radius: var(--radius);
  padding: 1rem;
  margin-bottom: 1rem;
  box-shadow: var(--shadow);
}

.search-container {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.search-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 2;
}

.time-filter {
  display: flex;
  gap: 1rem;
  flex: 2;
}

.year-filter, .month-filter {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.search-buttons {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}

#search-input, #year-select, #month-select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  width: 100%;
}

/* Fun Stats Styles */
.fun-stats {
  background-color: white;
  border-radius: var(--radius);
  padding: 1.5rem;
  margin: 1.5rem 0;
  box-shadow: var(--shadow);
}

.fun-stats h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: var(--peach-secondary);
}

.fun-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.fun-stat {
  background-color: #f9f9f9;
  border-radius: var(--radius);
  padding: 1rem;
}

.fun-stat h4 {
  margin-top: 0;
  color: var(--peach-primary);
  margin-bottom: 0.8rem;
}

.emoji-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.emoji-item {
  font-size: 1.5rem;
}

.emoji-count {
  font-size: 0.8rem;
  color: #666;
  margin-left: 0.2rem;
}

.word-stats, .activity-data {
  font-size: 0.9rem;
  line-height: 1.6;
}

/* Timeline Month/Year Headers */
.month-year-header {
  background-color: var(--peach-accent);
  color: var(--peach-secondary);
  padding: 0.8rem 1.2rem;
  margin: 1.5rem -1rem 1rem;
  border-radius: var(--radius);
  font-weight: bold;
  box-shadow: var(--shadow);
  position: sticky;
  top: 10px;
  z-index: 10;
}

#search-btn, #reset-btn {
  padding: 0.5rem 1rem;
  background-color: var(--peach-secondary);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

#reset-btn {
  background-color: #666;
}

#search-btn:hover {
  background-color: #6745a0;
}

#reset-btn:hover {
  background-color: #555;
}

.stats {
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
  background-color: white;
  border-radius: var(--radius);
  padding: 1rem;
  box-shadow: var(--shadow);
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 80px;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: bold;
  color: var(--peach-secondary);
}

.stat-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  color: #888;
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.post {
  background-color: white;
  border-radius: var(--radius);
  padding: 1.5rem;
  box-shadow: var(--shadow);
  transition: transform 0.2s;
}

.post:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.post-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  color: #666;
}

.post-date {
  font-weight: bold;
}

.post-content {
  margin-bottom: 1rem;
  line-height: 1.6;
}

.post-media {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.8rem;
  margin-top: 1rem;
}

.media-item {
  width: 100%;
  border-radius: calc(var(--radius) - 4px);
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.media-item img, .media-item video {
  width: 100%;
  height: auto;
  display: block;
  transition: transform 0.3s;
}

.media-item:hover img, .media-item:hover video {
  transform: scale(1.03);
}

.post-footer {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  font-size: 0.9rem;
  color: #888;
}

.post-stats {
  display: flex;
  gap: 1rem;
}

.empty-timeline {
  text-align: center;
  padding: 2rem;
  background-color: white;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #888;
}

.post-error {
  background-color: #fff5f5;
  color: #e74c3c;
  padding: 1rem;
  border-radius: var(--radius);
  border-left: 4px solid #e74c3c;
}

.media-error {
  background-color: #f8f8f8;
  color: #666;
  padding: 1rem;
  text-align: center;
  border-radius: var(--radius);
  font-size: 0.9rem;
}

.hidden {
  display: none !important;
}

footer {
  margin-top: 3rem;
  text-align: center;
  color: #888;
  font-size: 0.8rem;
  padding: 1rem;
  border-top: 1px solid #eee;
}

/* Mobile Responsiveness */
@media (max-width: 600px) {
  body {
    padding: 0.5rem;
  }
  
  header {
    padding: 1rem;
  }
  
  .logo {
    width: 30px;
    height: 30px;
  }
  
  h1 {
    font-size: 1.5rem;
  }
  
  .search-container {
    flex-direction: column;
    align-items: stretch;
    gap: 0.8rem;
  }
  
  .search-field, .date-field, .search-buttons {
    width: 100%;
  }
  
  .search-buttons {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .search-buttons button {
    width: 100%;
    margin-bottom: 0.3rem;
  }
  
  .post {
    padding: 1rem;
  }
  
  .stats {
    padding: 0.8rem;
  }
  
  .stat-value {
    font-size: 1.5rem;
  }
  
  .post-media {
    grid-template-columns: 1fr;
  }
}`;
}

/**
 * Generate JavaScript for the viewer
 * Includes month and year organization and stats display
 */
function generateViewerJS(): string {
  debugLog('viewer', 'Generating viewer JavaScript');
  
  return `// Peach Archive Viewer Script
document.addEventListener('DOMContentLoaded', function() {
  const timeline = document.getElementById('timeline');
  const searchInput = document.getElementById('search-input');
  const dateFilter = document.getElementById('date-filter');
  const searchBtn = document.getElementById('search-btn');
  const resetBtn = document.getElementById('reset-btn');
  const visiblePostsCounter = document.getElementById('visible-posts');
  
  // Embed the data right in the HTML file to make it completely self-contained
  // The placeholder ARCHIVE_DATA_JSON will be replaced with actual JSON data
  const archiveData = ARCHIVE_DATA_JSON;
  
  // Store sorted posts for filtering
  let sortedPosts = [];
  
  // Display the posts
  initializeViewer();
  
  // Initialize the viewer and set up event listeners
  function initializeViewer() {
    if (!archiveData || !archiveData.posts || archiveData.posts.length === 0) {
      timeline.innerHTML = '<div class="empty-timeline">No posts found in this archive.</div>';
      return;
    }
    
    // Sort posts by creation time (newest first)
    sortedPosts = [...archiveData.posts].sort((a, b) => b.createdTime - a.createdTime);
    
    // Populate year dropdown
    const yearSelect = document.getElementById('year-select');
    const monthSelect = document.getElementById('month-select');
    const years = new Set();
    
    sortedPosts.forEach(post => {
      if (post.createdTime) {
        const date = new Date(post.createdTime * 1000);
        years.add(date.getFullYear());
      }
    });
    
    // Sort years descending
    const sortedYears = [...years].sort((a, b) => b - a);
    
    // Add year options
    sortedYears.forEach(year => {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      yearSelect.appendChild(option);
    });
    
    // Display all posts initially
    displayPosts(sortedPosts);
    updateVisiblePostsCount(sortedPosts.length);
    
    // Set up event listeners
    searchBtn.addEventListener('click', filterPosts);
    resetBtn.addEventListener('click', resetFilter);
    
    yearSelect.addEventListener('change', function() {
      filterPosts();
    });
    
    monthSelect.addEventListener('change', function() {
      filterPosts();
    });
    
    // Also allow pressing Enter in the search input
    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        filterPosts();
      }
    });
    
    // Calculate fun stats
    calculateFunStats(sortedPosts);
  }
  
  // Calculate and display fun stats
  function calculateFunStats(posts) {
    // Log some debug information to the console for easier troubleshooting
    console.log('Calculating stats for', posts.length, 'posts');
    
    // Find posts with media for debugging
    const postsWithMedia = posts.filter(post => 
      (post.localMediaPaths && post.localMediaPaths.length > 0) || 
      (post.media && post.media.length > 0)
    );
    
    // Log media posts info to console - this is safer than trying to modify the DOM
    console.log('Found', postsWithMedia.length, 'posts with media');
    postsWithMedia.forEach(post => {
      console.log('Post ID:', post.id);
      console.log('Local media paths:', post.localMediaPaths || []);
      console.log('Media count:', post.media ? post.media.length : 0);
    });
    
    if (!posts || posts.length === 0) return;
    
    // 1. Emoji extraction and counting
    const emojiRegex = /[\p{Emoji}]/gu;
    let allEmojis = [];
    let totalEmojiCount = 0;
    let wordCount = 0;
    let totalChars = 0;
    let activeDays = {};
    
    posts.forEach(post => {
      // Extract message content
      let messageContent = '';
      
      if (post.message) {
        if (typeof post.message === 'string') {
          messageContent = post.message;
        } else if (Array.isArray(post.message)) {
          post.message.forEach(part => {
            if (part && part.type === 'text' && part.text) {
              messageContent += part.text + ' ';
            }
          });
        }
      }
      
      // Count words and characters
      if (messageContent) {
        // Count words (crude approximation)
        const words = messageContent.split(/\s+/).filter(w => w.length > 0);
        wordCount += words.length;
        
        // Count characters
        totalChars += messageContent.length;
        
        // Extract emojis
        const emojis = messageContent.match(emojiRegex) || [];
        allEmojis = allEmojis.concat(emojis);
        totalEmojiCount += emojis.length;
      }
      
      // Track activity by date
      if (post.createdTime) {
        const date = new Date(post.createdTime * 1000);
        const dateKey = date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate();
        
        if (!activeDays[dateKey]) {
          activeDays[dateKey] = 0;
        }
        
        activeDays[dateKey]++;
      }
    });
    
    // Update emoji count
    document.getElementById('emoji-count').textContent = totalEmojiCount;
    
    // Update active days count
    const activeDaysCount = Object.keys(activeDays).length;
    document.getElementById('active-days').textContent = activeDaysCount;
    
    // Count emoji frequency
    const emojiFrequency = {};
    allEmojis.forEach(emoji => {
      if (!emojiFrequency[emoji]) {
        emojiFrequency[emoji] = 0;
      }
      emojiFrequency[emoji]++;
    });
    
    // Sort and display top emojis
    const topEmojis = Object.entries(emojiFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    const emojiListEl = document.querySelector('#top-emojis .emoji-list');
    if (topEmojis.length > 0) {
      emojiListEl.innerHTML = topEmojis.map(function(item) {
        var emoji = item[0];
        var count = item[1];
        return '<div class="emoji-item">' + emoji + '<span class="emoji-count">' + count + '</span></div>';
      }).join('');
    } else {
      emojiListEl.innerHTML = 'No emojis found in your posts.';
    }
    
    // Display word stats
    const wordStatsEl = document.querySelector('#word-count .word-stats');
    wordStatsEl.innerHTML = 
      '<p>Total words: <strong>' + wordCount + '</strong></p>' +
      '<p>Total characters: <strong>' + totalChars + '</strong></p>' +
      '<p>Average words per post: <strong>' + Math.round(wordCount / posts.length) + '</strong></p>';
    
    // Display activity data
    const activeDaysCount = Object.keys(activeDays).length;
    const mostActiveDay = Object.entries(activeDays)
      .sort((a, b) => b[1] - a[1])[0];
    
    const activityDataEl = document.querySelector('#activity-chart .activity-data');
    
    if (mostActiveDay) {
      const [dateKey, count] = mostActiveDay;
      const [year, month, day] = dateKey.split('-').map(Number);
      const dateObj = new Date(year, month, day);
      const formattedDate = dateObj.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      });
      
      activityDataEl.innerHTML = 
        '<p>Active days: <strong>' + activeDaysCount + '</strong></p>' +
        '<p>Most active day: <strong>' + formattedDate + '</strong> with ' + count + ' posts</p>' +
        '<p>Average posts per active day: <strong>' + Math.round(posts.length / activeDaysCount) + '</strong></p>';
    } else {
      activityDataEl.innerHTML = 'No activity data available.';
    }
  }
  
  // Setup the date filter with appropriate min/max dates
  function setupDateFilter() {
    try {
      // Find earliest and latest post dates
      let earliestTimestamp = Infinity;
      let latestTimestamp = 0;
      
      sortedPosts.forEach(post => {
        if (post.createdTime) {
          const timestamp = post.createdTime;
          
          if (timestamp < earliestTimestamp) {
            earliestTimestamp = timestamp;
          }
          
          if (timestamp > latestTimestamp) {
            latestTimestamp = timestamp;
          }
        }
      });
      
      // Convert to Date objects
      const earliestDate = new Date(earliestTimestamp * 1000);
      const latestDate = new Date(latestTimestamp * 1000);
      
      // Format as YYYY-MM-DD for input[type="date"]
      const formatDateForInput = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return \`\${year}-\${month}-\${day}\`;
      };
      
      // Set min and max dates for the input
      dateFilter.min = formatDateForInput(earliestDate);
      dateFilter.max = formatDateForInput(latestDate);
      
      // Set placeholder
      dateFilter.setAttribute('placeholder', 'Select a date to filter posts');
    } catch (error) {
      console.error('Error setting up date filter:', error);
    }
  }
  
  // Search and filter posts by content and date
  function filterByDate() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const selectedDate = dateFilter.value;
    
    if (!searchTerm && !selectedDate) {
      alert('Please enter a search term or select a date');
      return;
    }
    
    try {
      // Prepare date filter if selected
      let selectedTimestamp = null;
      if (selectedDate) {
        const selectedDateObj = new Date(selectedDate);
        selectedDateObj.setHours(0, 0, 0, 0);
        selectedTimestamp = selectedDateObj.getTime() / 1000;
      }
      
      // Filter posts based on search term and/or date
      const filteredPosts = sortedPosts.filter(post => {
        // Check date filter
        let matchesDate = true;
        if (selectedTimestamp) {
          if (!post.createdTime) return false;
          
          // Convert post timestamp to date object
          const postDate = new Date(post.createdTime * 1000);
          postDate.setHours(0, 0, 0, 0);
          const postTimestamp = postDate.getTime() / 1000;
          
          // Check if post date matches selected date
          matchesDate = postTimestamp === selectedTimestamp;
        }
        
        // Check content filter
        let matchesContent = true;
        if (searchTerm) {
          matchesContent = false;
          
          // Search in message content
          if (post.message) {
            if (Array.isArray(post.message)) {
              for (const msg of post.message) {
                if (msg.type === 'text' && msg.text && msg.text.toLowerCase().includes(searchTerm)) {
                  matchesContent = true;
                  break;
                }
              }
            } else if (typeof post.message === 'string' && post.message.toLowerCase().includes(searchTerm)) {
              matchesContent = true;
            }
          }
        }
        
        return matchesDate && matchesContent;
      });
      
      // Display filtered posts
      displayPosts(filteredPosts);
      updateVisiblePostsCount(filteredPosts.length);
      
      // Scroll to top
      window.scrollTo(0, 0);
    } catch (error) {
      console.error('Error filtering posts:', error);
      alert('Error filtering posts. Please try again.');
    }
  }
  
  // Reset all filters
  function resetFilter() {
    // Clear all inputs
    searchInput.value = '';
    dateFilter.value = '';
    
    // Display all posts
    displayPosts(sortedPosts);
    updateVisiblePostsCount(sortedPosts.length);
    
    // Scroll to top
    window.scrollTo(0, 0);
  }
  
  // Update the visible posts counter
  function updateVisiblePostsCount(count) {
    if (visiblePostsCounter) {
      visiblePostsCounter.textContent = count;
    }
  }
  
  // Display posts in the timeline with month/year organization
  function displayPosts(posts) {
    // Clear timeline
    timeline.innerHTML = '';
    
    if (posts.length === 0) {
      timeline.innerHTML = '<div class="empty-timeline">No posts found for the selected filters. Try different filters or reset.</div>';
      return;
    }
    
    // Group posts by year and month
    const groupedPosts = {};
    
    posts.forEach(post => {
      if (!post.createdTime) return;
      
      const postDate = new Date(post.createdTime * 1000);
      const year = postDate.getFullYear();
      const month = postDate.getMonth();
      
      if (!groupedPosts[year]) {
        groupedPosts[year] = {};
      }
      
      if (!groupedPosts[year][month]) {
        groupedPosts[year][month] = [];
      }
      
      groupedPosts[year][month].push(post);
    });
    
    // Sort years (descending) and display posts
    const years = Object.keys(groupedPosts).sort((a, b) => b - a);
    
    years.forEach(year => {
      // Sort months descending (Dec to Jan)
      const months = Object.keys(groupedPosts[year]).sort((a, b) => b - a);
      
      months.forEach(month => {
        const monthPosts = groupedPosts[year][month];
        if (monthPosts.length === 0) return;
        
        // Create month/year header
        const monthHeader = document.createElement('div');
        monthHeader.className = 'month-year-header';
        
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        monthHeader.textContent = monthNames[month] + ' ' + year + ' (' + monthPosts.length + ' posts)';
        monthHeader.dataset.year = year;
        monthHeader.dataset.month = month;
        
        timeline.appendChild(monthHeader);
        
        // Add posts for this month
        monthPosts.forEach(post => {
          const postElement = createPostElement(post);
          postElement.dataset.year = year;
          postElement.dataset.month = month;
          timeline.appendChild(postElement);
        });
      });
    });
    
    // Update visible posts counter
    updateVisiblePostsCount(posts.length);
  }
  
  // Filter posts based on selected criteria
  function filterPosts() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const selectedYear = document.getElementById('year-select').value;
    const selectedMonth = document.getElementById('month-select').value;
    
    // Start with all posts
    let filteredPosts = [...sortedPosts];
    
    // Apply year filter
    if (selectedYear) {
      filteredPosts = filteredPosts.filter(post => {
        if (!post.createdTime) return false;
        const postDate = new Date(post.createdTime * 1000);
        return postDate.getFullYear().toString() === selectedYear;
      });
    }
    
    // Apply month filter
    if (selectedMonth) {
      filteredPosts = filteredPosts.filter(post => {
        if (!post.createdTime) return false;
        const postDate = new Date(post.createdTime * 1000);
        return postDate.getMonth().toString() === selectedMonth;
      });
    }
    
    // Apply search term filter
    if (searchTerm) {
      filteredPosts = filteredPosts.filter(post => {
        // Extract message content for searching
        let messageContent = '';
        
        if (post.message) {
          if (typeof post.message === 'string') {
            messageContent = post.message.toLowerCase();
          } else if (Array.isArray(post.message)) {
            post.message.forEach(part => {
              if (part && part.type === 'text' && part.text) {
                messageContent += part.text.toLowerCase() + ' ';
              }
            });
          }
        }
        
        return messageContent.includes(searchTerm);
      });
    }
    
    // Display filtered posts
    displayPosts(filteredPosts);
    calculateFunStats(filteredPosts);
  }
  
  // Reset all filters
  function resetFilter() {
    searchInput.value = '';
    document.getElementById('year-select').selectedIndex = 0;
    document.getElementById('month-select').selectedIndex = 0;
    displayPosts(sortedPosts);
    calculateFunStats(sortedPosts);
  }
  
  // Create an HTML element for a post
  function createPostElement(post) {
    const postElement = document.createElement('article');
    postElement.className = 'post';
    postElement.setAttribute('data-id', post.id);
    
    try {
      // Format the post date - handle potential timestamp format issues
      let postDate;
      let dateForAttribute = '';
      const timestamp = post.createdTime;
      
      if (timestamp) {
        // Check if it's in seconds (Peach API) or milliseconds
        const dateObj = timestamp > 9999999999 
          ? new Date(timestamp) // Already in milliseconds
          : new Date(timestamp * 1000); // Convert from seconds to milliseconds
        
        // Format date for displaying
        postDate = dateObj.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        // Format date for data attribute (for filtering)
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        dateForAttribute = \`\${year}-\${month}-\${day}\`;
      } else {
        postDate = 'Unknown date';
      }
      
      // Store date as data attribute for filtering
      postElement.setAttribute('data-date', dateForAttribute);
      
      // Create post HTML structure
      postElement.innerHTML = \`
        <div class="post-header">
          <span class="post-date">\${postDate}</span>
          <span class="post-id">#\${post.id}</span>
        </div>
        <div class="post-content">\${formatMessage(post.message)}</div>
        \${post.localMediaPaths && post.localMediaPaths.length > 0 
          ? \`<div class="post-media">\${createMediaElements(post.localMediaPaths)}</div>\`
          : (post.media && post.media.length > 0)
            ? \`<div class="post-media">\${createMediaElementsFromMedia(post.media, post.id)}</div>\`
            : ''}
        <div class="post-footer">
          <div class="post-stats">
            \${post.likeCount ? \`<span class="likes">❤️ \${post.likeCount}</span>\` : ''}
            \${post.commentCount ? \`<span class="comments">💬 \${post.commentCount}</span>\` : ''}
          </div>
        </div>
      \`;
    } catch (error) {
      console.error('Error creating post element:', error, post);
      postElement.innerHTML = \`
        <div class="post-error">
          <div class="post-header">Error displaying post #\${post.id || 'unknown'}</div>
        </div>
      \`;
    }
    
    return postElement;
  }
  
  // Format the message content for display with error handling
  function formatMessage(message) {
    try {
      if (!message) return '';
      
      // Handle array-style messages
      if (Array.isArray(message)) {
        const textParts = [];
        
        for (let i = 0; i < message.length; i++) {
          if (message[i] && message[i].type === 'text') {
            textParts.push(message[i].text);
          }
        }
        
        if (textParts.length > 0) {
          return textParts.join('\\n\\n').replace(/\\n/g, '<br>');
        }
      }
      
      // Handle simple string messages
      if (typeof message === 'string') {
        return message.replace(/\\n/g, '<br>');
      }
      
      return '';
    } catch (error) {
      console.error('Error formatting message:', error, message);
      return '<em>Error displaying message content</em>';
    }
  }
  
  // Create HTML elements for media files using paths
  function createMediaElements(mediaPaths) {
    if (!mediaPaths || !Array.isArray(mediaPaths)) return '';
    
    try {
      return mediaPaths.map(path => {
        if (!path) return '';
        
        const isVideo = path.endsWith('.mp4') || path.endsWith('.webm');
        
        if (isVideo) {
          return \`
            <div class="media-item">
              <video controls>
                <source src="media/\${path}" type="video/\${path.endsWith('.mp4') ? 'mp4' : 'webm'}">
                Your browser does not support the video tag.
              </video>
            </div>
          \`;
        } else {
          return \`
            <div class="media-item">
              <img src="media/\${path}" alt="Post media" loading="lazy">
            </div>
          \`;
        }
      }).join('');
    } catch (error) {
      console.error('Error creating media elements:', error);
      return '<div class="media-error">Error displaying media</div>';
    }
  }
  
  // Create HTML elements directly from media objects
  function createMediaElementsFromMedia(mediaItems, postId) {
    if (!mediaItems || !Array.isArray(mediaItems)) return '';
    
    try {
      return mediaItems.map((media, index) => {
        if (!media || !media.url) return '';
        
        // Get file extension from URL
        const url = media.url;
        const ext = url.split('.').pop()?.toLowerCase() || '';
        const isVideo = ext === 'mp4' || ext === 'webm';
        
        // If we have a post ID, use the new naming scheme
        let filename = '';
        if (postId) {
          // Replicate the same naming logic used in generateMediaFilename
          const shortPostId = postId.substring(0, 8);
          const paddedIndex = String(index).padStart(2, '0');
          // Using string concatenation instead of template literals to avoid syntax issues
          filename = "post_" + shortPostId + "_img_" + paddedIndex + "." + (ext || 'jpg');
        } else {
          // Fallback to old naming scheme
          filename = "media_" + String(index).padStart(3, '0') + "." + (ext || 'jpg');
        }
        
        if (isVideo) {
          // Use string concatenation instead of template literals
          return '<div class="media-item">' +
                 '<video controls>' +
                 '<source src="media/' + filename + '" type="video/' + ext + '">' +
                 'Your browser does not support the video tag.' +
                 '</video>' +
                 '</div>';
        } else {
          // Use string concatenation instead of template literals
          return '<div class="media-item">' +
                 '<img src="media/' + filename + '" alt="Post media" loading="lazy">' +
                 '</div>';
        }
      }).join('');
    } catch (error) {
      console.error('Error creating media elements from media objects:', error);
      return '<div class="media-error">Error displaying media</div>';
    }
  }
});`;
}