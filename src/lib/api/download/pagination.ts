// Pagination functionality for fetching posts
import { debugLog } from './utils';
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
  // Setup initial state
  const paginationState: PaginationState = {
    currentPage: 0,
    totalPages: 0,
    cursor: null,
    postsLoaded: 0,
    estimatedTotal: 0,
    isComplete: false
  };
  
  // Determine max pages to fetch
  const maxPages = options.maxPages || Infinity;
  const pauseTime = options.pauseBetweenRequests || 500;
  
  // Combined posts array
  let allPosts: PeachPost[] = [];
  
  // Paginate until no more posts or reached limit
  debugLog('pagination', `Starting pagination for user: ${username}, max pages: ${maxPages === Infinity ? 'unlimited' : maxPages}`);
  
  while (!paginationState.isComplete && paginationState.currentPage < maxPages) {
    // Update page counter
    paginationState.currentPage++;
    
    // Prepare form data with cursor
    const formData = new FormData();
    formData.append('username', username);
    formData.append('token', token);
    if (paginationState.cursor) {
      formData.append('cursor', paginationState.cursor);
    }
    
    // Fetch current page
    debugLog('pagination', `Fetching page ${paginationState.currentPage}${paginationState.cursor ? ' with cursor' : ''}`);
    
    try {
      const response = await fetchStream(formData);
      
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
      
      // Add posts to our collection
      allPosts = [...allPosts, ...pagePosts];
      paginationState.postsLoaded = allPosts.length;
      
      // Get next cursor if available
      paginationState.cursor = response.data.data.cursor || null;
      
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