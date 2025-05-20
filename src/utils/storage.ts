import { PolaroidPhoto } from "~/types/polaroid";
import { CanvasViewport } from "~/primitives/infiniteCanvas";
import { logError } from "~/utils/errorUtils";

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

export interface StorageOptions {
  username?: string;
}

export interface PolaroidStorageOptions extends StorageOptions {
  route: string;
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
 * Create a photo-specific storage key
 * @param photoId The photo ID
 * @param route The route identifier
 * @param username Optional username for user-specific storage
 * @returns The properly formatted storage key
 */
function createPhotoKey(photoId: string, route: string, username?: string): string {
  return createKey(`${route}_photo_${photoId}`, { username });
}

/**
 * Store photo data with a unified approach
 * @param photoId The photo ID
 * @param data The photo data to store
 * @param route The route identifier
 * @param username Optional username for user-specific storage
 */
export function storePhotoData(
  photoId: string, 
  data: Partial<PhotoData>, 
  route: string,
  username?: string
): void {
  // First get existing data (if any)
  const existingData = retrievePhotoData(photoId, route, username) || {};
  
  // Merge with new data
  const mergedData = { ...existingData, ...data };
  
  // Store with the unified format
  const key = createPhotoKey(photoId, route, username);
  localStorage.setItem(key, JSON.stringify(mergedData));
}

/**
 * Retrieve photo data
 * @param photoId The photo ID
 * @param route The route identifier 
 * @param username Optional username for user-specific storage
 * @returns The photo data or null if not found
 */
export function retrievePhotoData(
  photoId: string, 
  route: string,
  username?: string
): PhotoData | null {
  if (typeof window === 'undefined') return null;
  
  try {
    // Try the new consolidated format first
    const key = createPhotoKey(photoId, route, username);
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Fallback to legacy formats if new format not found
    const legacyPrefixes = [
      `${APP_PREFIX}_${route}_photo_${photoId}_`,
      username ? `${APP_PREFIX}_${username}_${route}_photo_${photoId}_` : null,
      `peach_pos_${photoId}`
    ].filter(Boolean);
    
    let position = null;
    let rotation = null;
    let zIndex = null;
    let isFlipped = false;
    let isPinned = false;
    
    // Check each legacy format
    for (const prefix of legacyPrefixes) {
      if (!prefix) continue;
      
      if (prefix.startsWith('peach_pos_')) {
        // Special case for peach_pos_ format
        const posStored = localStorage.getItem(prefix);
        if (posStored) {
          try {
            const posData = JSON.parse(posStored);
            position = posData.x !== undefined && posData.y !== undefined 
              ? { x: posData.x, y: posData.y }
              : position;
            rotation = posData.rotation !== undefined ? posData.rotation : rotation;
            zIndex = posData.zIndex !== undefined ? posData.zIndex : zIndex;
          } catch (e) {
            console.error(`[STORAGE] Error parsing ${prefix}:`, e);
          }
        }
      } else {
        // Standard property-specific legacy format
        const positionStored = localStorage.getItem(`${prefix}position`);
        const rotationStored = localStorage.getItem(`${prefix}rotation`);
        const zIndexStored = localStorage.getItem(`${prefix}zindex`);
        const flippedStored = localStorage.getItem(`${prefix}flipped`);
        const pinnedStored = localStorage.getItem(`${prefix}pinned`);
        
        try {
          position = positionStored ? JSON.parse(positionStored) : position;
        } catch (e) {
          console.error(`[STORAGE] Error parsing position for ${prefix}:`, e);
        }
        
        rotation = rotationStored ? parseFloat(rotationStored) : rotation;
        zIndex = zIndexStored ? parseInt(zIndexStored, 10) : zIndex;
        isFlipped = flippedStored === 'true' ? true : isFlipped;
        isPinned = pinnedStored === 'true' ? true : isPinned;
      }
    }
    
    // If we found anything, return a consolidated object
    if (position || rotation !== null || zIndex !== null || isFlipped || isPinned) {
      const data: PhotoData = {};
      if (position) data.position = position;
      if (rotation !== null) data.rotation = rotation;
      if (zIndex !== null) data.zIndex = zIndex;
      if (isFlipped) data.isFlipped = isFlipped;
      if (isPinned) data.isPinned = isPinned;
      
      // Save in new format for future
      storePhotoData(photoId, data, route, username);
      
      return data;
    }
    
    return null;
  } catch (e) {
    console.error(`[STORAGE] Error retrieving photo data for ${photoId}:`, e);
    return null;
  }
}

/**
 * Save a photo's position to localStorage
 * @param id Photo ID
 * @param position Position object
 * @param route Route identifier
 * @param username Optional username
 */
export function savePhotoPosition(
  id: string,
  position: { x: number; y: number },
  route: string,
  username?: string
): void {
  storePhotoData(id, { position }, route, username);
}

/**
 * Get a photo's position from localStorage
 * @param id Photo ID
 * @param route Route identifier
 * @param username Optional username
 * @returns The position or null if not found
 */
export function getPhotoPosition(
  id: string,
  route: string,
  username?: string
): { x: number; y: number } | null {
  const data = retrievePhotoData(id, route, username);
  return data?.position || null;
}

/**
 * Save a photo's rotation to localStorage
 * @param id Photo ID
 * @param rotation Rotation value
 * @param route Route identifier
 * @param username Optional username
 */
export function savePhotoRotation(
  id: string,
  rotation: number,
  route: string,
  username?: string
): void {
  storePhotoData(id, { rotation }, route, username);
}

/**
 * Get a photo's rotation from localStorage
 * @param id Photo ID
 * @param route Route identifier
 * @param username Optional username
 * @returns The rotation or null if not found
 */
export function getPhotoRotation(
  id: string,
  route: string,
  username?: string
): number | null {
  const data = retrievePhotoData(id, route, username);
  return data?.rotation !== undefined ? data.rotation : null;
}

/**
 * Save a photo's z-index to localStorage
 * @param id Photo ID
 * @param zIndex Z-index value
 * @param route Route identifier
 * @param username Optional username
 */
export function savePhotoZIndex(
  id: string,
  zIndex: number,
  route: string,
  username?: string
): void {
  storePhotoData(id, { zIndex }, route, username);
}

/**
 * Get a photo's z-index from localStorage
 * @param id Photo ID
 * @param route Route identifier
 * @param username Optional username
 * @returns The z-index or null if not found
 */
export function getPhotoZIndex(
  id: string,
  route: string,
  username?: string
): number | null {
  const data = retrievePhotoData(id, route, username);
  return data?.zIndex !== undefined ? data.zIndex : null;
}

/**
 * Save a photo's flipped state to localStorage
 * @param id Photo ID
 * @param isFlipped Flipped state
 * @param route Route identifier
 * @param username Optional username
 */
export function savePhotoFlipState(
  id: string,
  isFlipped: boolean,
  route: string,
  username?: string
): void {
  storePhotoData(id, { isFlipped }, route, username);
}

/**
 * Get a photo's flipped state from localStorage
 * @param id Photo ID
 * @param route Route identifier
 * @param username Optional username
 * @returns The flipped state or false if not found
 */
export function getPhotoFlipState(
  id: string,
  route: string,
  username?: string
): boolean {
  const data = retrievePhotoData(id, route, username);
  return data?.isFlipped || false;
}

/**
 * Save a photo's pinned state to localStorage
 * @param id Photo ID
 * @param isPinned Pinned state
 * @param route Route identifier
 * @param username Optional username
 */
export function savePhotoPinnedState(
  id: string,
  isPinned: boolean,
  route: string,
  username?: string
): void {
  storePhotoData(id, { isPinned }, route, username);
}

/**
 * Get a photo's pinned state from localStorage
 * @param id Photo ID
 * @param route Route identifier
 * @param username Optional username
 * @returns The pinned state or false if not found
 */
export function getPhotoPinnedState(
  id: string,
  route: string,
  username?: string
): boolean {
  const data = retrievePhotoData(id, route, username);
  return data?.isPinned || false;
}

// Canvas viewport storage

/**
 * Save canvas viewport state to localStorage
 * @param viewport The viewport state
 * @param route The route identifier
 * @param username Optional username
 */
export function saveCanvasViewport(
  viewport: CanvasViewport,
  route: string,
  username?: string
): void {
  const key = `${route}_canvas_viewport`;
  storeItem(key, viewport, { username });
}

/**
 * Get canvas viewport state from localStorage
 * @param route The route identifier
 * @param username Optional username
 * @returns The viewport state or null if not found
 */
export function getCanvasViewport(
  route: string,
  username?: string
): CanvasViewport | null {
  const key = `${route}_canvas_viewport`;
  return retrieveItem(key, { username });
}

// Post storage functions

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
  if (cursor !== null && cursor !== undefined) {
    storeItem('cursor', cursor as string, options);
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
 * @param options Storage options including username and route
 * @returns Array of PolaroidPhoto objects
 */
export function transformPostsToPolaroids(
  posts: any[], 
  options: PolaroidStorageOptions
): PolaroidPhoto[] {
  if (!posts.length) return [];
  
  const { route, username } = options;
  
  return posts.map((post, index) => {
    // Get stored data if available
    const storedData = retrievePhotoData(post.id, route, username);
    
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
    
    // Use stored flip state
    const flipped = storedData?.isFlipped || false;
    
    return {
      id: post.id,
      src,
      caption,
      date,
      position,
      rotation,
      zIndex,
      flipped
    };
  });
}

/**
 * Store initial positions for photos if they don't exist
 * @param predefinedPositions Map of photo IDs to positions
 * @param route The route identifier
 * @param username Optional username
 */
export function storeInitialPositions(
  predefinedPositions: Record<string, { x: number; y: number }>,
  route: string,
  username?: string
): void {
  if (typeof window === 'undefined') return;
  
  Object.entries(predefinedPositions).forEach(([id, position]) => {
    // Only save if position doesn't already exist
    if (!getPhotoPosition(id, route, username)) {
      savePhotoPosition(id, position, route, username);
    }
  });
}

/**
 * Initialize photos from a collection of source data
 * @param photos Base photo data
 * @param route Route identifier
 * @param options Additional options
 * @returns Processed photos with positions and properties
 */
export function initializeCanvasPhotos(
  photos: Array<{ id: string; src: string; caption: string; date: string }>,
  route: string,
  options?: {
    username?: string;
    predefinedPositions?: Record<string, { x: number; y: number }>;
    centerX?: number;
    centerY?: number;
  }
): PolaroidPhoto[] {
  const { 
    username,
    predefinedPositions = {},
    centerX = typeof window !== "undefined" ? window.innerWidth / 2 : 0,
    centerY = typeof window !== "undefined" ? window.innerHeight / 2 : 0,
  } = options || {};

  return photos.map((photo, index) => {
    // Get stored data
    const storedData = retrievePhotoData(photo.id, route, username);
    
    // Use predefined positions or calculate defaults
    const predefinedPosition = predefinedPositions[photo.id];
    
    // Calculate position - prioritize stored > predefined > calculated default
    const x = storedData?.position?.x || 
              predefinedPosition?.x || 
              centerX + Math.cos(index * 2.4) * Math.sqrt(index) * 80 - 110;
              
    const y = storedData?.position?.y || 
              predefinedPosition?.y || 
              centerY + Math.sin(index * 2.4) * Math.sqrt(index) * 80 - 135;
    
    // Use stored rotation or default to a small random angle
    const getSeededRandom = (seed: string, min: number, max: number) => {
      let h = 0;
      for (let i = 0; i < seed.length; i++) {
        h = Math.imul(h ^ seed.charCodeAt(i), 956789);
      }
      h = h & h; // Convert to 32bit integer
      return min + ((h % 1000) / 1000) * (max - min);
    };
    
    const rotation = storedData?.rotation || getSeededRandom(photo.id, -10, 10);
    
    // Use stored zIndex or default, keeping within the 0-10 range for photos
    const defaultZIndex = Math.max(0, Math.min(9, 9 - Math.floor((index / photos.length) * 10)));
    const zIndex = storedData?.zIndex || defaultZIndex;
    
    // Use stored flip/pin states or defaults
    const flipped = storedData?.isFlipped || false;

    return {
      ...photo,
      position: { x, y },
      rotation,
      zIndex,
      flipped
    };
  });
}

/**
 * Cleanup legacy photo storage formats and consolidate them
 * @returns Summary of cleanup operation results
 */
export function cleanupPhotoStorage(): {
  originalEntries: number;
  consolidatedPhotos: number;
} {
  if (typeof window === 'undefined') {
    return { originalEntries: 0, consolidatedPhotos: 0 };
  }

  logError("CLEANUP", "Starting photo storage cleanup process", {
    level: "info",
  });

  const allKeys = Object.keys(localStorage);
  const photoKeys = allKeys.filter(
    (key) =>
      key.includes("peach_preserves_login_photo_") ||
      key.includes("peach_preserves_photo_") ||
      key.includes("peach_pos_"),
  );

  const photoPattern =
    /(?:peach_preserves_(?:([^_]+)_)?(?:([^_]+)_)?photo_([^_]+)|peach_pos_([^_]+))/;

  // Map to track photos and consolidate data
  const photoMap = new Map<
    string,
    {
      id: string;
      route: string;
      username?: string;
      data: PhotoData;
    }
  >();

  // Process each key
  photoKeys.forEach((key) => {
    try {
      const match = key.match(photoPattern);

      if (match) {
        // Extract ID and context from key
        const possibleUsername = match[1];
        const possibleRoute = match[2] || "login"; // Default to login if not specified
        const id1 = match[3];
        const id2 = match[4]; // From peach_pos_ format
        const id = id1 || id2;

        // Determine username/route based on pattern
        let username: string | undefined;
        let route: string;

        if (id === id1) {
          // From peach_preserves format
          username =
            possibleUsername && possibleUsername !== "login"
              ? possibleUsername
              : undefined;
          route = possibleRoute;
        } else {
          // From peach_pos format
          route = "login"; // Default for this format
        }

        // If we've identified a valid ID
        if (id) {
          // Create unique key for this photo (combine route and ID)
          const mapKey = `${route}_${id}${username ? `_${username}` : ""}`;

          // Get data for this entry
          let data: PhotoData = {};

          // Process based on key format
          if (key.includes("peach_pos_")) {
            // Handle peach_pos_ format
            try {
              const posData = JSON.parse(localStorage.getItem(key) || "{}");

              if (posData.x !== undefined && posData.y !== undefined) {
                data.position = { x: posData.x, y: posData.y };
              }
              if (posData.rotation !== undefined) {
                data.rotation = posData.rotation;
              }
              if (posData.zIndex !== undefined) {
                data.zIndex = posData.zIndex;
              }
            } catch (e) {
              logError("CLEANUP", e, { operation: "parseJSON", key });
            }
          } else if (key.endsWith("_position")) {
            // Handle position property
            try {
              data.position = JSON.parse(localStorage.getItem(key) || "");
            } catch (e) {
              logError("CLEANUP", e, { operation: "parsePosition", key });
            }
          } else if (key.endsWith("_rotation")) {
            // Handle rotation property
            data.rotation = parseFloat(localStorage.getItem(key) || "0");
          } else if (key.endsWith("_zindex")) {
            // Handle zIndex property
            data.zIndex = parseInt(localStorage.getItem(key) || "0", 10);
          } else if (key.endsWith("_flipped")) {
            // Handle flipped property
            data.isFlipped = localStorage.getItem(key) === "true";
          } else if (key.endsWith("_pinned")) {
            // Handle pinned property
            data.isPinned = localStorage.getItem(key) === "true";
          } else if (!key.includes("_property")) {
            // This might be a consolidated format already
            try {
              const storedData = JSON.parse(localStorage.getItem(key) || "{}");
              data = storedData;
            } catch (e) {
              logError("CLEANUP", e, { operation: "parseData", key });
            }
          }

          // Update map - merge with existing data if present
          if (Object.keys(data).length > 0) {
            if (photoMap.has(mapKey)) {
              const existing = photoMap.get(mapKey)!;
              photoMap.set(mapKey, {
                ...existing,
                data: { ...existing.data, ...data },
              });
            } else {
              photoMap.set(mapKey, { id, route, username, data });
            }
          }
        }
      }
    } catch (e) {
      logError("CLEANUP", e, { operation: "processKey", key });
    }
  });

  // Remove all old entries
  photoKeys.forEach((key) => {
    localStorage.removeItem(key);
  });

  // Store consolidated entries
  photoMap.forEach(({ id, route, username, data }) => {
    storePhotoData(id, data, route, username);
  });

  logError("CLEANUP", "Cleanup complete", {
    level: "info",
    originalEntries: photoKeys.length,
    consolidatedPhotos: photoMap.size
  });

  return {
    originalEntries: photoKeys.length,
    consolidatedPhotos: photoMap.size,
  };
}