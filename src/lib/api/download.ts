// API client for downloading and archiving Peach data
import { PeachPost } from '~/context/peach';
import { useExport } from '~/context/export';

// Import modular components
import { DownloadOptions, UpdateExportProgressFn, MediaMap } from './download/types';
import { debugLog, DEV_MODE } from './download/utils';
import { extractMediaUrls, downloadMedia, generateMediaFilename } from './download/media';
import { createArchiveData, createArchive, downloadBlob } from './download/archive';
import { fetchPostsWithPagination, PaginationOptions } from './download/pagination';

// Global reference to the export context state updater
let updateExportProgress: UpdateExportProgressFn;

/**
 * Create a downloadable archive of a user's Peach data
 * This implementation:
 * 1. Uses cached posts already loaded in the application or fetches them with pagination
 * 2. Downloads additional media files as needed
 * 3. Packages everything into a structured JSON file with a viewer
 * 4. Creates a ZIP file with all content
 * 5. Triggers the browser download
 */
export async function downloadPeachData(
  token: string, 
  options: DownloadOptions = { includeComments: true, includeImages: true },
  exportContext?: ReturnType<typeof useExport>,
  userData?: any
): Promise<string> {
  debugLog('download', 'Starting download process', { 
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
    const username = userData?.username || options.username;
    debugLog('user', `Using username: ${username}`);
    
    // Get posts directly from user data or fetch them
    let posts: PeachPost[] = [];
    let paginationState = null;
    
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
      debugLog('posts', 'No posts in user data, fetching from API with pagination');
      
      // Set up pagination options based on dev mode
      const isDevMode = options.devMode !== undefined ? options.devMode : DEV_MODE;
      const paginationOptions: PaginationOptions = {
        maxPages: isDevMode ? 1 : undefined // Only fetch first page in dev mode
      };
      
      try {
        // Fetch posts with pagination
        const result = await fetchPostsWithPagination(token, username, updateExportProgress, paginationOptions);
        posts = result.posts;
        paginationState = result.paginationState;
        
        debugLog('posts', `Fetched ${posts.length} posts with pagination`, paginationState);
      } catch (err) {
        console.error('[API] Error fetching posts with pagination:', err);
        throw new Error(`Failed to fetch posts: ${err instanceof Error ? err.message : String(err)}`);
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
      completedItems: 0,
      totalItems: posts.length
    });
    
    const mediaMap: MediaMap = {};
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
    const archiveUsername = username || 'user';
    debugLog('archive', `Using username for archive: ${archiveUsername}`);
    
    let archiveData;
    try {
      archiveData = createArchiveData(archiveUsername, posts, mediaUrlToPath);
      
      // Add pagination info if available
      if (paginationState) {
        archiveData.metadata.paginationInfo = {
          isComplete: paginationState.isComplete,
          pagesLoaded: paginationState.totalPages,
          cursor: paginationState.cursor
        };
      }
      
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
      debugLog('zip', 'Creating archive with media files', { mediaCount: Object.keys(mediaMap).length });
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
        
        // Complete the export process
        if (exportContext) {
          // First update progress to 100%
          updateExportProgress({ 
            percentage: 100,
            currentActivity: 'Download complete! Archive ready.',
            completedItems: posts.length,
            totalItems: posts.length,
            phase: 'packaging'
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
      // Create the error object
      const errorData = {
        code: 'EXPORT_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create archive',
        retryable: true,
        details: error
      };
      
      debugLog('error', 'Setting export status to error', errorData);
      
      // Update the export status
      if (exportContext.setExportData) {
        exportContext.setExportData({
          ...exportContext.exportData,
          status: 'error',
          error: errorData
        });
      }
    }
    
    throw new Error(`Failed to preserve your Peach data: ${error instanceof Error ? error.message : String(error)}`);
  }
}