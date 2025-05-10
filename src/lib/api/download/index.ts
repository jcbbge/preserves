// Main download module that orchestrates the download process
import JSZip from 'jszip';
import { PeachPost } from '~/context/peach';
import { useExport } from '~/context/export';

// Import from separate modules
import { DownloadOptions, ArchivePost, ArchiveMetadata, PeachArchive, UpdateExportProgressFn } from './types';
import { debugLog, DEV_MODE, formatFileSize, createSafeArchivePath } from './utils';
import { fetchPosts } from './posts';
import { downloadMedia, generateMediaFilename, extractMediaUrls } from './media';

// Global reference to the export context state updater
let updateExportProgress: UpdateExportProgressFn = () => {};

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
  debugLog('download', '=å Starting download process', { 
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
      debugLog('posts', 'No posts in user data, fetching from API');
        
      // Fallback to fetching posts from API
      posts = await fetchPosts(token, username, options.devMode);
    }
      
    if (!posts || posts.length === 0) {
      throw new Error('No posts found to archive');
    }
      
    debugLog('posts', `Processing ${posts.length} posts`);
      
    // Analyze message block types
    const messageTypes = new Set<string>();
    const messageTypeCounts: Record<string, number> = {};
    
    posts.forEach(post => {
      if (Array.isArray(post.message)) {
        post.message.forEach(block => {
          if (block.type) {
            messageTypes.add(block.type);
            messageTypeCounts[block.type] = (messageTypeCounts[block.type] || 0) + 1;
          }
        });
      }
    });
    
    debugLog('posts', `Found ${posts.length} posts to archive`);
    debugLog('posts', 'Message block types:', {
      types: Array.from(messageTypes),
      counts: messageTypeCounts
    });
    
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
    const mediaUrlToFilename: Record<string, string> = {};
    let mediaIndex = 0;
    
    if (options.includeImages) {
      const mediaUrls = extractMediaUrls(posts);
      debugLog('media', `Found ${mediaUrls.length} media URLs across ${posts.length} posts`);
      
      try {
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
        
        // For each media URL, download and store in the map
        for (const url of mediaUrls) {
          try {
            mediaIndex++;
            const filename = generateMediaFilename(url, mediaIndex);
            mediaUrlToFilename[url] = filename;
            
            debugLog('media', `Downloading media ${mediaIndex}/${mediaUrls.length}: ${url}`);
            const blob = await downloadMedia(url);
            
            if (blob) {
              mediaMap[filename] = blob;
              debugLog('media', `Successfully downloaded media to ${filename} (${formatFileSize(blob.size)})`);
            } else {
              debugLog('media', `Failed to download media from ${url}`);
            }
          } catch (mediaError) {
            debugLog('media', `Error downloading media ${url}: ${mediaError instanceof Error ? mediaError.message : String(mediaError)}`);
          }
          
          // Update progress periodically
          if (mediaIndex % 5 === 0 || mediaIndex === mediaUrls.length) {
            updateExportProgress({
              currentActivity: `Downloading media (${mediaIndex}/${mediaUrls.length})...`,
              percentage: 40 + (mediaIndex / mediaUrls.length) * 20,
              totalItems: mediaUrls.length,
              completedItems: mediaIndex
            });
          }
        }
        
        debugLog('media', `Downloaded ${Object.keys(mediaMap).length} media files out of ${mediaUrls.length} URLs`);
      } catch (batchError) {
        console.error('[API] Error during media batch processing:', batchError);
        debugLog('media', `Error during media batch processing: ${batchError instanceof Error ? batchError.message : String(batchError)}`);
      }
    } else {
      debugLog('media', 'Media download skipped (disabled in options)');
    }
    
    // Step 3: Prepare posts for the archive
    debugLog('archive', 'Preparing posts for archive');
    updateExportProgress({ 
      phase: 'content', 
      percentage: 70,
      currentActivity: 'Organizing your archive...',
      completedItems: 0,
      totalItems: posts.length
    });
    
    // Create archive structure
    const archivePosts: ArchivePost[] = [];
    
    // Process each post for archive
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const archivePost: ArchivePost = { ...post };
      
      // Link media files to posts
      if (options.includeImages) {
        const postMediaUrls = extractMediaUrls([post]);
        const localMediaPaths: string[] = [];
        
        // For each media URL in this post, add the filename to the post
        for (const url of postMediaUrls) {
          const filename = mediaUrlToFilename[url];
          if (filename) {
            const archivePath = createSafeArchivePath('media', filename);
            localMediaPaths.push(archivePath);
          }
        }
        
        if (localMediaPaths.length > 0) {
          archivePost.localMediaPaths = localMediaPaths;
        }
      }
      
      archivePosts.push(archivePost);
      
      // Update progress periodically
      if ((i + 1) % 10 === 0 || i === posts.length - 1) {
        updateExportProgress({
          currentActivity: `Organizing posts (${i + 1}/${posts.length})...`,
          percentage: 70 + ((i + 1) / posts.length) * 10,
          completedItems: i + 1,
          totalItems: posts.length
        });
      }
    }
    
    // Create archive metadata
    const metadata: ArchiveMetadata = {
      username: username || 'unknown',
      exportDate: new Date().toISOString(),
      postCount: archivePosts.length,
      mediaCount: Object.keys(mediaMap).length,
      totalSize: Object.values(mediaMap).reduce((total, blob) => total + blob.size, 0)
    };
    
    const peachArchive: PeachArchive = {
      metadata,
      posts: archivePosts
    };
    
    // Step 4: Create the ZIP file
    debugLog('archive', 'Creating ZIP file');
    updateExportProgress({ 
      phase: 'packaging', 
      percentage: 85,
      currentActivity: 'Creating ZIP archive...',
      completedItems: 0,
      totalItems: archivePosts.length + Object.keys(mediaMap).length
    });
    
    const zip = new JSZip();
    
    // Add archive JSON
    const archiveJson = JSON.stringify(peachArchive, null, 2);
    zip.file('archive.json', archiveJson);
    
    // Add a simple HTML viewer
    zip.file('index.html', createHtmlViewer(peachArchive));
    
    // Add media files
    let fileCount = 0;
    const totalFiles = Object.keys(mediaMap).length;
    
    for (const [filename, blob] of Object.entries(mediaMap)) {
      fileCount++;
      const archivePath = createSafeArchivePath('media', filename);
      zip.file(archivePath, blob);
      
      // Update progress periodically
      if (fileCount % 10 === 0 || fileCount === totalFiles) {
        updateExportProgress({
          currentActivity: `Adding media files to archive (${fileCount}/${totalFiles})...`,
          percentage: 85 + (fileCount / totalFiles) * 10,
          completedItems: fileCount,
          totalItems: totalFiles
        });
      }
    }
    
    // Generate the ZIP file
    debugLog('archive', 'Generating final ZIP file');
    updateExportProgress({ 
      percentage: 95,
      currentActivity: 'Generating final archive file...',
    });
    
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    // Step 5: Trigger the download
    debugLog('archive', `Archive created successfully (${formatFileSize(zipBlob.size)})`);
    updateExportProgress({ 
      percentage: 100,
      currentActivity: 'Archive created successfully!',
    });
    
    // Generate a download filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const downloadFilename = `peach-archive-${username || 'user'}-${timestamp}.zip`;
    debugLog('download', `Creating download with filename: ${downloadFilename}`);
    
    // Create a URL for the blob
    const url = URL.createObjectURL(zipBlob);
    
    // Create a temporary download link
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadFilename;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
    
    return downloadFilename;
  } catch (error) {
    const errorMessage = `Error creating archive: ${error instanceof Error ? error.message : String(error)}`;
    debugLog('error', errorMessage);
    console.error('[API]', errorMessage);
    
    // Update export context with error
    if (exportContext && exportContext.setExportData) {
      exportContext.setExportData('error', errorMessage);
    }
    
    throw error;
  } finally {
    // Ensure export is completed in the context
    if (exportContext && exportContext.setExportData) {
      exportContext.setExportData('completed', true);
    }
  }
}

/**
 * Creates a basic HTML viewer for the archive
 */
function createHtmlViewer(archive: PeachArchive): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Peach Archive - ${archive.metadata.username}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .post { border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
    .post-header { display: flex; align-items: center; margin-bottom: 10px; }
    .post-content { margin-bottom: 10px; }
    .post-media { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 15px; }
    .post-media img, .post-media video { max-width: 100%; max-height: 400px; border-radius: 4px; }
    .post-date { color: #666; font-size: 0.9em; margin-top: 10px; }
    .metadata { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 30px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Peach Archive</h1>
    <p>User: ${archive.metadata.username}</p>
    <p>Date: ${new Date(archive.metadata.exportDate).toLocaleDateString()}</p>
  </div>
  
  <div class="metadata">
    <h2>Archive Info</h2>
    <p>Posts: ${archive.metadata.postCount}</p>
    <p>Media files: ${archive.metadata.mediaCount}</p>
    <p>Media size: ${formatFileSize(archive.metadata.totalSize)}</p>
  </div>
  
  <h2>Posts</h2>
  <div class="posts">
    ${archive.posts.map(post => {
      // Format post date
      const date = new Date(post.createdTime).toLocaleString();
      
      // Format post content
      let content = '';
      if (Array.isArray(post.message)) {
        content = post.message.map(block => {
          if (block.type === 'text') {
            return `<p>${block.text}</p>`;
          }
          return '';
        }).join('');
      } else if (typeof post.message === 'string') {
        content = `<p>${post.message}</p>`;
      }
      
      // Format media
      let media = '';
      if (post.localMediaPaths && post.localMediaPaths.length > 0) {
        media = '<div class="post-media">';
        post.localMediaPaths.forEach(path => {
          const isImage = path.match(/\.(jpg|jpeg|png|gif|webp)$/i);
          if (isImage) {
            media += `<img src="${path}" alt="Post media" loading="lazy">`;
          } else {
            media += `<video src="${path}" controls></video>`;
          }
        });
        media += '</div>';
      }
      
      return `
        <div class="post">
          <div class="post-header">
            <h3>${post.author?.displayName || post.author?.username || 'Unknown'}</h3>
          </div>
          <div class="post-content">${content}</div>
          ${media}
          <div class="post-date">${date}</div>
        </div>
      `;
    }).join('')}
  </div>
</body>
</html>`;
}

// Re-export from other modules for backward compatibility
export * from './types';
export * from './utils';
export * from './media';
export * from './posts';