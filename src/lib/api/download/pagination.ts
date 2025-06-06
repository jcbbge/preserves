// Pagination functionality for fetching posts
import { debugLog, recordNetworkRequest } from './utils';
import { PeachPost } from '~/context/peach';
import { UpdateExportProgressFn } from './types';
import { fetchStream } from '~/routes/api/stream';

/**
 * Pagination options
 */
export interface PaginationOptions {
  maxPages?: number;    // Maximum number of pages to fetch (dev mode)
  pauseBetweenRequests?: number; // Milliseconds to wait between requests (default: 500)
  batchSize?: number;   // Number of posts to request per batch
}

/**
 * Pagination state for tracking progress
 */
export interface PaginationState {
  currentPage: number;
  totalPages: number;    // Estimated based on fetched pages
  cursor: string | null; // Current cursor for next page
  postsLoaded: number;
  estimatedTotal: number;
  isComplete: boolean;
}

/**
 * Fetches all posts using pagination via cursor
 */
export async function fetchPostsWithPagination(
  token: string,
  username: string,
  updateProgress: UpdateExportProgressFn,
  options: PaginationOptions = {}
): Promise<{
  posts: PeachPost[];
  paginationState: PaginationState;
}> {
  // Setup initial state - always start fresh from beginning
  const paginationState: PaginationState = {
    currentPage: 0,
    totalPages: 0,
    cursor: null, // Always start from beginning
    postsLoaded: 0,
    estimatedTotal: 0,
    isComplete: false
  };
  
  // Determine max pages to fetch
  const maxPages = options.maxPages;
  const pauseTime = options.pauseBetweenRequests || 500;
  
  // Combined posts array
  let allPosts: PeachPost[] = [];
  
  // Paginate until no more posts or reached limit
  debugLog('pagination', `Starting pagination for user: ${username}, max pages: ${maxPages ? maxPages : 'unlimited'}`);
  
  while (!paginationState.isComplete && (!maxPages || paginationState.currentPage < maxPages)) {
    // Update page counter
    paginationState.currentPage++;
    
    // Prepare form data with cursor
    const formData = new FormData();
    formData.append('username', username);
    formData.append('token', token);
    if (paginationState.cursor) {
      formData.append('cursor', paginationState.cursor);
      debugLog('pagination', `Using cursor for page ${paginationState.currentPage}: ${paginationState.cursor.substring(0, 20)}...`);
    }
    
    // Fetch current page
    debugLog('pagination', `Fetching page ${paginationState.currentPage}${paginationState.cursor ? ' with cursor' : ''}`);
    
    try {
      const requestStart = Date.now();
      const response = await fetchStream(formData);
      const requestTime = Date.now() - requestStart;
      
      // Record network metrics
      recordNetworkRequest(response.success, requestTime);
      
      // DEBUG: LOG FULL PEACH API RESPONSE
      debugLog('pagination', `FULL PEACH API RESPONSE for page ${paginationState.currentPage}:`, JSON.stringify(response, null, 2));
      
      // Process response
      if (!response.success || !response.data?.data?.posts) {
        debugLog('pagination', `Failed to fetch page ${paginationState.currentPage}`, response);
        throw new Error(`Failed to fetch page ${paginationState.currentPage}: ${response.error || 'Unknown error'}`);
      }
      
      // Get posts from this page
      const pagePostsCount = response.data.data.posts.length;
      const pagePosts = response.data.data.posts;
      
      // If we got no posts, we're done
      if (pagePostsCount === 0) {
        debugLog('pagination', 'No posts returned, pagination complete');
        paginationState.isComplete = true;
        break;
      }
      
      debugLog('pagination', `Received ${pagePostsCount} posts on page ${paginationState.currentPage}`);
      debugLog('pagination', `First 3 post IDs on page ${paginationState.currentPage}:`, 
        pagePosts.slice(0, 3).map(p => p.id));
      
      // Create a set of existing post IDs for fast lookup
      const existingIds = new Set(allPosts.map(p => p.id));
      
      // Filter out any posts we already have
      const newPosts = pagePosts.filter(post => !existingIds.has(post.id));
      
      debugLog('pagination', `Page ${paginationState.currentPage}: ${pagePostsCount} received, ${newPosts.length} new posts after deduplication`);
      
      if (newPosts.length < pagePostsCount) {
        debugLog('pagination', `DUPLICATE POSTS FROM API: ${pagePostsCount - newPosts.length} duplicates detected on page ${paginationState.currentPage}`);
        // Log the duplicate IDs
        const duplicateIds = pagePosts.filter(post => existingIds.has(post.id)).map(p => p.id);
        debugLog('pagination', 'Duplicate post IDs from API:', duplicateIds.slice(0, 5));
      }
      
      // Add only new posts to our collection
      allPosts = [...allPosts, ...newPosts];
      paginationState.postsLoaded = allPosts.length;
      
      // Get next cursor if available - try multiple possible locations
      const nextCursor = response.data.cursor || response.data.data?.cursor || null;
      debugLog('pagination', `Next cursor received: ${nextCursor ? nextCursor.substring(0, 50) + '...' : 'null'}`);
      
      // Debug: Log full response data structure to see cursor context
      debugLog('pagination', 'Response data keys:', Object.keys(response.data));
      if (response.data.data) {
        debugLog('pagination', 'Response data.data keys:', Object.keys(response.data.data));
      }
      debugLog('pagination', 'FULL RESPONSE DATA STRUCTURE:', JSON.stringify(response.data, null, 2));
      
      paginationState.cursor = nextCursor;
      
      // If no cursor, we've reached the end
      if (!paginationState.cursor) {
        debugLog('pagination', 'No cursor returned, pagination complete');
        paginationState.isComplete = true;
        break;
      }
      
      // Update progress
      updateProgress({
        phase: 'discovery',
        percentage: Math.min(30, (paginationState.currentPage / (maxPages || 10)) * 30),
        currentActivity: `Loading page ${paginationState.currentPage} of posts (${allPosts.length} loaded so far)...`,
        completedItems: allPosts.length,
        totalItems: Math.max(allPosts.length, paginationState.estimatedTotal)
      });
      
      // Set estimated total if we haven't reached the end
      if (paginationState.currentPage === 1) {
        // On first page, make a rough estimate based on posts per page
        paginationState.estimatedTotal = pagePostsCount * 5; // Rough estimate
        debugLog('pagination', `Initial estimate: ~${paginationState.estimatedTotal} posts`);
      } else {
        // Refine estimate based on posts loaded so far
        paginationState.estimatedTotal = Math.ceil(allPosts.length * 1.2); // Add 20% margin
      }
      
      // Optional throttling to avoid rate limits
      if (paginationState.currentPage > 1 && pauseTime > 0) {
        debugLog('pagination', `Pausing for ${pauseTime}ms before next request`);
        await new Promise(resolve => setTimeout(resolve, pauseTime));
      }
      
    } catch (error) {
      console.error('[API] Pagination error on page ' + paginationState.currentPage + ':', error);
      // If this is the first page, rethrow - we need at least some posts
      if (paginationState.currentPage === 1) {
        throw error;
      }
      
      // Otherwise, we'll stop pagination but return what we have
      debugLog('pagination', `Error during pagination, stopping after ${paginationState.currentPage - 1} pages`);
      paginationState.isComplete = true;
      break;
    }
  }
  
  // Update final pagination state
  paginationState.totalPages = paginationState.currentPage;
  debugLog('pagination', `Pagination complete: ${allPosts.length} posts from ${paginationState.totalPages} pages`);
  
  return { posts: allPosts, paginationState };
}