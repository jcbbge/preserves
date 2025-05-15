import { PolaroidPhoto } from "~/types/polaroid";

/**
 * Storage utility for Peach Preserves app
 * Provides a unified interface for localStorage operations
 */

// Constants
const APP_PREFIX = 'peach_preserves';

// Types
interface PhotoData {
  position?: { x: number; y: number };
  rotation?: number;
  zIndex?: number;
  isFlipped?: boolean;
  isPinned?: boolean;
}

interface StorageOptions {
  username?: string;
}

/**
 * Create a storage key with proper prefixing
 * @param key The base key
 * @param options Options including username for user-specific storage
 * @returns Properly prefixed storage key
 */
function createKey(key: string, options: StorageOptions = {}): string {
  const prefix = options.username 
    ? `${APP_PREFIX}_${options.username}`
    : APP_PREFIX;
  
  return `${prefix}_${key}`;
}

/**
 * Store an item in localStorage with proper serialization
 * @param key The key to store under
 * @param value The value to store
 * @param options Storage options
 */
export function storeItem<T>(key: string, value: T, options: StorageOptions = {}): void {
  if (typeof window === 'undefined') return;
  
  try {
    const storageKey = createKey(key, options);
    const serialized = JSON.stringify(value);
    localStorage.setItem(storageKey, serialized);
  } catch (err) {
    console.error(`[STORAGE] Failed to store item '${key}':`, err);
  }
}

/**
 * Retrieve an item from localStorage with proper deserialization
 * @param key The key to retrieve
 * @param options Storage options
 * @returns The deserialized value or null if not found
 */
export function retrieveItem<T>(key: string, options: StorageOptions = {}): T | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const storageKey = createKey(key, options);
    const value = localStorage.getItem(storageKey);
    return value ? JSON.parse(value) : null;
  } catch (err) {
    console.error(`[STORAGE] Failed to retrieve item '${key}':`, err);
    return null;
  }
}

/**
 * Remove an item from localStorage
 * @param key The key to remove
 * @param options Storage options
 */
export function removeItem(key: string, options: StorageOptions = {}): void {
  if (typeof window === 'undefined') return;
  
  try {
    const storageKey = createKey(key, options);
    localStorage.removeItem(storageKey);
  } catch (err) {
    console.error(`[STORAGE] Failed to remove item '${key}':`, err);
  }
}

// Photo-specific storage functions

/**
 * Store photo data with a unified approach
 * @param photoId The photo ID
 * @param data The photo data to store
 * @param options Storage options
 */
export function storePhotoData(photoId: string, data: Partial<PhotoData>, options: StorageOptions = {}): void {
  // First get existing data (if any)
  const existingData = retrievePhotoData(photoId, options) || {};
  
  // Merge with new data
  const mergedData = { ...existingData, ...data };
  
  // Store with the unified format
  storeItem(`photo_${photoId}`, mergedData, options);
}

/**
 * Retrieve photo data
 * @param photoId The photo ID
 * @param options Storage options
 * @returns The photo data or null if not found
 */
export function retrievePhotoData(photoId: string, options: StorageOptions = {}): PhotoData | null {
  return retrieveItem<PhotoData>(`photo_${photoId}`, options);
}

/**
 * Store a collection of posts
 * @param posts The posts to store
 * @param options Storage options
 */
export function storePosts(posts: any[], options: StorageOptions = {}): void {
  storeItem('posts', posts, options);
}

/**
 * Retrieve stored posts
 * @param options Storage options
 * @returns The posts or empty array if none found
 */
export function retrievePosts<T>(options: StorageOptions = {}): T[] {
  return retrieveItem<T[]>('posts', options) || [];
}

/**
 * Store cursor for pagination
 * @param cursor The cursor value
 * @param options Storage options
 */
export function storeCursor(cursor: string | null, options: StorageOptions = {}): void {
  if (cursor) {
    storeItem('cursor', cursor, options);
  } else {
    removeItem('cursor', options);
  }
}

/**
 * Retrieve stored cursor
 * @param options Storage options
 * @returns The cursor or null if not found
 */
export function retrieveCursor(options: StorageOptions = {}): string | null {
  return retrieveItem<string>('cursor', options);
}

/**
 * Transform a collection of posts to polaroid format
 * This implementation is optimized to maintain referential equality when possible
 * @param posts The posts to transform
 * @param options Storage options including username
 * @returns Array of PolaroidPhoto objects
 */
export function transformPostsToPolaroids(posts: any[], options: StorageOptions = {}): PolaroidPhoto[] {
  if (!posts.length) return [];
  
  return posts.map((post, index) => {
    // Get stored data if available
    const storedData = retrievePhotoData(post.id, options);
    
    // Random initial position if not stored
    const position = storedData?.position || {
      x: Math.random() * 500 - 250,
      y: Math.random() * 300 - 100 + index * 30
    };
    
    // Use stored rotation or generate a random one
    const rotation = storedData?.rotation !== undefined
      ? storedData.rotation
      : Math.random() * 20 - 10;
      
    // Format the date string for display
    const date = new Date(post.createdTime).toLocaleDateString();
    
    // Extract caption from message
    let caption = "Post with content";
    if (post.message) {
      if (Array.isArray(post.message)) {
        const textParts = post.message
          .filter((part: any) => part.type === "text")
          .map((part: any) => part.text);
          
        if (textParts.length) {
          caption = textParts.join("\n\n");
        }
      } else if (typeof post.message === "string") {
        caption = post.message;
      }
    }
    
    // Extract image URL from message
    let src = '/placeholder-image.jpg'; // Fallback
    if (post.message && Array.isArray(post.message)) {
      for (const part of post.message) {
        if (part.type === "image" && part.src) {
          src = part.src;
          break;
        }
      }
    }
    
    // Use stored zIndex or calculate based on position in array
    const zIndex = storedData?.zIndex !== undefined
      ? storedData.zIndex
      : posts.length - index;
    
    return {
      id: post.id,
      src,
      caption,
      date,
      position,
      rotation,
      zIndex
    };
  });
}
