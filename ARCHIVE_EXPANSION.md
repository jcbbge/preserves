# Peach Preserves Archive Expansion Features

This document outlines the planned enhancements to the Peach Preserves archiving functionality, focusing on three key areas:

1. **Enhanced Pagination Support**
2. **Semantic Search Capabilities**
3. **Date-based Search and Filtering**

## 1. Enhanced Pagination Support

### Current Implementation
- Currently limited to first page of posts
- Dev mode only fetches a single batch of posts
- No cursor tracking between API requests

### Requirements
- Add support for full pagination via cursor mechanism
- Allow configurable number of pages in dev mode
- Track and report pagination progress

### Implementation Plan

#### A. Add Pagination Types
```typescript
// In types.ts
export interface PaginationOptions {
  maxPages?: number;    // Maximum number of pages to fetch (dev mode)
  pageSize?: number;    // Posts per page to request
  saveProgress?: boolean; // Whether to save pagination progress for resuming
}

// Extend DownloadOptions
export interface DownloadOptions {
  // ...existing options
  pagination?: PaginationOptions;
}

// For tracking pagination state
export interface PaginationState {
  currentPage: number;
  totalPages: number;    // Estimated based on post counts
  cursor: string | null; // Current cursor for next page
  postsLoaded: number;
  estimatedTotal: number;
  isComplete: boolean;
}
```

#### B. Implement Cursor-based Pagination Function
```typescript
/**
 * Fetches all posts using pagination via cursor
 */
async function fetchPostsWithPagination(
  token: string,
  username: string,
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
  const isDevMode = options.devMode !== undefined ? options.devMode : DEV_MODE;
  const maxPages = options.maxPages || (isDevMode ? 1 : Infinity);
  
  // Combined posts array
  let allPosts: PeachPost[] = [];
  
  // Paginate until no more posts or reached limit
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
    const response = await fetchStream(formData);
    
    // Process response
    if (!response.success || !response.data?.data?.posts) {
      throw new Error(`Failed to fetch page ${paginationState.currentPage}`);
    }
    
    // Get posts from this page
    const pagePostsCount = response.data.data.posts.length;
    const pagePosts = response.data.data.posts;
    
    // If we got no posts, we're done
    if (pagePostsCount === 0) {
      paginationState.isComplete = true;
      break;
    }
    
    // Add posts to our collection
    allPosts = [...allPosts, ...pagePosts];
    paginationState.postsLoaded = allPosts.length;
    
    // Get next cursor if available
    paginationState.cursor = response.data.data.cursor || null;
    
    // If no cursor, we've reached the end
    if (!paginationState.cursor) {
      paginationState.isComplete = true;
      break;
    }
    
    // Update progress
    updateExportProgress({
      phase: 'discovery',
      percentage: Math.min(30, (paginationState.currentPage / (maxPages || 10)) * 30),
      currentActivity: `Loading page ${paginationState.currentPage} of posts (${allPosts.length} loaded so far)...`
    });
    
    // Optional throttling to avoid rate limits
    if (paginationState.currentPage > 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Update final pagination state
  paginationState.totalPages = paginationState.currentPage;
  
  return { posts: allPosts, paginationState };
}
```

#### C. Update Main Download Function
```typescript
// In download.ts, replace the existing post fetching code
let posts: PeachPost[] = [];
let paginationState: PaginationState | null = null;

if (userData && userData.streams && userData.streams[0] && userData.streams[0].posts) {
  // Use posts from user data if available
  posts = userData.streams[0].posts;
  debugLog('posts', `Found ${posts.length} posts in user data`);
  
  // In dev mode, limit the number of posts
  const isDevMode = options.devMode !== undefined ? options.devMode : DEV_MODE;
  if (isDevMode) {
    const maxPosts = options.pagination?.maxPerPage || 10;
    if (posts.length > maxPosts) {
      debugLog('dev', `Limiting posts to ${maxPosts} (from ${posts.length})`);
      posts = posts.slice(0, maxPosts);
    }
  }
} else {
  debugLog('posts', 'No posts in user data, fetching from API with pagination');
  
  // Fetch posts with pagination
  const result = await fetchPostsWithPagination(token, username, {
    maxPages: options.pagination?.maxPages,
    devMode: options.devMode
  });
  
  posts = result.posts;
  paginationState = result.paginationState;
}
```

#### D. Add Pagination Information to Archive
```typescript
// Include pagination info in archive metadata
export interface ArchiveMetadata {
  // ...existing fields
  pagination?: {
    totalPages: number;
    postsPerPage: number;
    isComplete: boolean;
    cursorState?: string; // For resuming downloads
  };
}

// Then update the metadata creation:
const metadata: ArchiveMetadata = {
  username: username || 'unknown',
  exportDate: new Date().toISOString(),
  postCount: archivePosts.length,
  mediaCount: Object.keys(mediaMap).length,
  totalSize: Object.values(mediaMap).reduce((total, blob) => total + blob.size, 0),
  pagination: paginationState ? {
    totalPages: paginationState.totalPages,
    postsPerPage: paginationState.postsLoaded / paginationState.totalPages,
    isComplete: paginationState.isComplete,
    cursorState: paginationState.cursor
  } : undefined
};
```

## 2. Semantic Search Capabilities

### Current Implementation
- Basic text matching in viewer
- No advanced search features
- No indexing of post content

### Requirements
- Support for semantic/fuzzy search
- Natural language content queries
- Search across all post content types

### Implementation Plan

#### A. Define Search Types
```typescript
// In types.ts
export interface SearchIndex {
  tokens: string[];       // Tokenized words from all posts
  postIndices: {[token: string]: number[]};  // Map tokens to post indices
  mediaIndices: {[token: string]: string[]};  // Map tokens to media paths
  rawText: {[postId: string]: string};       // Raw text content by post ID
}

// Add to archive structure
export interface PeachArchive {
  metadata: ArchiveMetadata;
  posts: ArchivePost[];
  searchIndex?: SearchIndex;  // Optional search index
}
```

#### B. Create Search Indexing Module
```typescript
// In search.ts
import { PeachPost, ArchivePost } from './types';

/**
 * Creates a search index from posts
 */
export function createSearchIndex(posts: ArchivePost[]): SearchIndex {
  const tokens: Set<string> = new Set();
  const postIndices: {[token: string]: number[]} = {};
  const mediaIndices: {[token: string]: string[]} = {};
  const rawText: {[postId: string]: string} = {};
  
  // Process each post
  posts.forEach((post, index) => {
    // Extract all text content
    const postText = extractTextContent(post);
    
    // Store raw text
    if (post.id) {
      rawText[post.id] = postText;
    }
    
    // Tokenize text
    const postTokens = tokenizeText(postText);
    
    // Add to indices
    postTokens.forEach(token => {
      // Add to token set
      tokens.add(token);
      
      // Add post index to token's list
      if (!postIndices[token]) {
        postIndices[token] = [];
      }
      postIndices[token].push(index);
      
      // If post has media, index it
      if (post.localMediaPaths && post.localMediaPaths.length > 0) {
        if (!mediaIndices[token]) {
          mediaIndices[token] = [];
        }
        post.localMediaPaths.forEach(path => {
          if (!mediaIndices[token].includes(path)) {
            mediaIndices[token].push(path);
          }
        });
      }
    });
  });
  
  return {
    tokens: Array.from(tokens),
    postIndices,
    mediaIndices,
    rawText
  };
}

/**
 * Extract all text content from a post
 */
function extractTextContent(post: PeachPost): string {
  let text = '';
  
  // Handle different message formats
  if (Array.isArray(post.message)) {
    post.message.forEach(block => {
      if (block.type === 'text' && block.text) {
        text += block.text + ' ';
      }
    });
  } else if (typeof post.message === 'string') {
    text += post.message;
  }
  
  // Also add metadata as searchable content
  if (post.id) text += ' ' + post.id;
  if (post.createdTime) {
    const date = new Date(post.createdTime * 1000);
    text += ' ' + date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }
  
  return text;
}

/**
 * Tokenize text for indexing
 */
function tokenizeText(text: string): string[] {
  if (!text) return [];
  
  // Normalize text: lowercase, remove punctuation
  const normalized = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')  // Replace punctuation with space
    .replace(/\s+/g, ' ')      // Normalize whitespace
    .trim();
  
  // Split into tokens
  const tokens = normalized.split(' ');
  
  // Filter stop words
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'to', 'of', 'for', 'with']);
  return tokens.filter(token => token.length > 1 && !stopWords.has(token));
}

/**
 * Search the index for posts matching a query
 */
export function searchPosts(
  query: string,
  posts: ArchivePost[],
  index: SearchIndex
): {
  posts: ArchivePost[];
  relevance: {[postId: string]: number};
} {
  // Tokenize query
  const queryTokens = tokenizeText(query);
  
  // Calculate relevance scores
  const relevance: {[postId: string]: number} = {};
  
  queryTokens.forEach(token => {
    // Get all posts containing this token
    const matchingIndices = index.postIndices[token] || [];
    
    matchingIndices.forEach(postIdx => {
      const post = posts[postIdx];
      if (!post || !post.id) return;
      
      if (!relevance[post.id]) {
        relevance[post.id] = 0;
      }
      
      // Increase relevance score
      relevance[post.id] += 1;
    });
  });
  
  // Sort posts by relevance
  const matchingPosts = posts.filter(post => post.id && relevance[post.id] > 0);
  matchingPosts.sort((a, b) => {
    const scoreA = a.id ? relevance[a.id] : 0;
    const scoreB = b.id ? relevance[b.id] : 0;
    return scoreB - scoreA;
  });
  
  return {
    posts: matchingPosts,
    relevance
  };
}
```

#### C. Integrate Search Indexing into Archive Creation
```typescript
// In download.ts
import { createSearchIndex } from './search';

// After creating archive posts
const searchIndex = createSearchIndex(archivePosts);

// Add to archive
const peachArchive: PeachArchive = {
  metadata,
  posts: archivePosts,
  searchIndex
};
```

#### D. Update HTML Viewer with Search Interface
Enhance the HTML viewer to use the search index for more powerful searches, including a more sophisticated search UI that allows filtering and sorting results.

## 3. Date-based Search and Filtering

### Current Implementation
- Limited date filtering in viewer
- No date range search
- No date indexing

### Requirements
- Comprehensive date filtering
- Date range searches
- Calendar-based navigation

### Implementation Plan

#### A. Add Date Index Types
```typescript
// In types.ts
export interface DateIndex {
  years: number[];          // All years in the archive
  months: {[year: number]: number[]};  // Months per year
  days: {[yearMonth: string]: number[]};  // Days per year-month
  postsByDate: {[dateKey: string]: number[]};  // Posts by normalized date
}

// Add to archive structure
export interface PeachArchive {
  metadata: ArchiveMetadata;
  posts: ArchivePost[];
  searchIndex?: SearchIndex;
  dateIndex?: DateIndex;
}
```

#### B. Create Date Indexing Module
```typescript
// In date-index.ts
import { ArchivePost, DateIndex } from './types';

/**
 * Creates a date index from posts
 */
export function createDateIndex(posts: ArchivePost[]): DateIndex {
  const years = new Set<number>();
  const months: {[year: number]: Set<number>} = {};
  const days: {[yearMonth: string]: Set<number>} = {};
  const postsByDate: {[dateKey: string]: number[]} = {};
  
  // Process each post
  posts.forEach((post, index) => {
    if (!post.createdTime) return;
    
    // Convert timestamp to Date
    const timestamp = typeof post.createdTime === 'number' 
      ? post.createdTime * 1000  // Convert seconds to milliseconds
      : new Date(post.createdTime).getTime();
    
    const date = new Date(timestamp);
    
    // Extract date components
    const year = date.getFullYear();
    const month = date.getMonth() + 1;  // 1-12
    const day = date.getDate();        // 1-31
    
    // Add to year index
    years.add(year);
    
    // Add to month index
    if (!months[year]) {
      months[year] = new Set<number>();
    }
    months[year].add(month);
    
    // Add to day index
    const yearMonthKey = `${year}-${month.toString().padStart(2, '0')}`;
    if (!days[yearMonthKey]) {
      days[yearMonthKey] = new Set<number>();
    }
    days[yearMonthKey].add(day);
    
    // Add to posts by date index
    const dateKey = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    if (!postsByDate[dateKey]) {
      postsByDate[dateKey] = [];
    }
    postsByDate[dateKey].push(index);
  });
  
  // Convert Sets to arrays
  return {
    years: Array.from(years).sort(),
    months: Object.fromEntries(
      Object.entries(months).map(([year, monthSet]) => 
        [year, Array.from(monthSet).sort()])
    ),
    days: Object.fromEntries(
      Object.entries(days).map(([yearMonth, daySet]) => 
        [yearMonth, Array.from(daySet).sort()])
    ),
    postsByDate
  };
}

/**
 * Get posts in a specific date range
 */
export function getPostsInDateRange(
  startDate: Date,
  endDate: Date,
  posts: ArchivePost[],
  dateIndex: DateIndex
): ArchivePost[] {
  // Format dates as YYYY-MM-DD
  const formatDate = (date: Date) => 
    `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  
  // Get all date keys in the range
  const dateKeys = Object.keys(dateIndex.postsByDate)
    .filter(dateKey => dateKey >= start && dateKey <= end);
  
  // Get post indices
  const postIndices = new Set<number>();
  dateKeys.forEach(dateKey => {
    dateIndex.postsByDate[dateKey].forEach(index => {
      postIndices.add(index);
    });
  });
  
  // Get posts
  return Array.from(postIndices)
    .map(index => posts[index])
    .filter(Boolean);
}

/**
 * Get post counts by date
 */
export function getPostCountsByDate(dateIndex: DateIndex): {[dateKey: string]: number} {
  const counts: {[dateKey: string]: number} = {};
  
  Object.entries(dateIndex.postsByDate).forEach(([dateKey, indices]) => {
    counts[dateKey] = indices.length;
  });
  
  return counts;
}
```

#### C. Integrate Date Indexing into Archive Creation
```typescript
// In download.ts
import { createDateIndex } from './date-index';

// After creating archive posts
const dateIndex = createDateIndex(archivePosts);

// Add to archive
const peachArchive: PeachArchive = {
  metadata,
  posts: archivePosts,
  searchIndex,
  dateIndex
};
```

#### D. Update HTML Viewer with Date Navigation
Enhance the HTML viewer with:
1. Calendar widget showing post activity by date
2. Date range selectors
3. Timeline view with date-based grouping
4. "Jump to date" functionality

## Integration and Implementation Notes

1. **File Structure**
   - Create dedicated modules for each feature:
     - `pagination.ts` - Cursor-based pagination functions
     - `search.ts` - Search indexing and functionality
     - `date-index.ts` - Date indexing and filtering

2. **Storage Concerns**
   - Search and date indices can increase file size
   - Consider making them optional with enablement flags
   - For large archives, implement lazy loading of indices

3. **Performance Optimizations**
   - Throttle pagination requests to avoid rate limits
   - Implement background processing for large archives
   - Stream archive creation for memory efficiency
   - Add progress reporting for all processing steps

4. **User Experience**
   - Add clear progress indicators for pagination
   - Allow cancellation and resumption of large downloads
   - Provide bandwidth usage estimates
   - Implement a "quick preview" while processing continues

## Testing Considerations

1. **Pagination Testing**
   - Test with accounts of varying sizes
   - Verify cursor handling with mocked APIs
   - Test resumption of interrupted downloads

2. **Search Testing**
   - Benchmark search performance with large indices
   - Test with multi-language content
   - Verify relevance ranking

3. **Date Filtering**
   - Test with archives spanning multiple years
   - Verify handling of time zones
   - Test edge cases like leap years and DST transitions