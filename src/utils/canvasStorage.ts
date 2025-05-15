/**
 * Unified API for canvas state storage in localStorage
 * This replaces multiple storage approaches with a single consistent pattern
 */

import { PolaroidPhoto } from "~/types/polaroid";
import { safeLocalStorage, logError } from "~/utils/errorUtils";

// Type definition for photo data stored in localStorage
export interface StoredPhotoData {
  position?: { x: number; y: number };
  rotation?: number;
  zIndex?: number;
  isFlipped?: boolean;
  isPinned?: boolean;
}

/**
 * Format the storage key for a photo
 * @param id Photo ID
 * @param route Route identifier ('login', 'dashboard', etc.)
 * @param username Optional username for user-specific storage
 * @returns Formatted storage key
 */
export function getPhotoStorageKey(
  id: string,
  route: string,
  username?: string,
): string {
  const basePrefix = "peach_preserves";
  const userPart = username ? `_${username}` : "";
  return `${basePrefix}${userPart}_${route}_photo_${id}`;
}

/**
 * Get photo data from localStorage
 * @param id Photo ID
 * @param route Route identifier ('login', 'dashboard', etc.)
 * @param username Optional username for user-specific storage
 * @returns The stored photo data or null if not found
 */
export function getPhotoData(
  id: string,
  route: string,
  username?: string,
): StoredPhotoData | null {
  if (typeof window === "undefined") return null;

  return safeLocalStorage(
    () => {
      // Get storage key
      const key = getPhotoStorageKey(id, route, username);

      // Try new format first
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }

      // Fall back to legacy formats if needed
      const legacyData = getLegacyPhotoData(id, route, username);
      if (legacyData) {
        // Migrate legacy data to new format
        savePhotoData(id, legacyData, route, username);
        return legacyData;
      }

      return null;
    },
    null,
    "CANVAS STORAGE",
  );
}

/**
 * Get legacy photo data from various old formats
 * @param id Photo ID
 * @param route Route identifier
 * @param username Optional username
 * @returns Combined data from legacy formats
 */
function getLegacyPhotoData(
  id: string,
  route: string,
  username?: string,
): StoredPhotoData | null {
  if (typeof window === "undefined") return null;

  try {
    // Legacy format checks - we look for various historical patterns
    const legacyFormats = [
      // Format 1: peach_preserves_login_photo_stockN_property
      {
        prefix: `peach_preserves_${route}_photo_${id}_`,
        properties: ["position", "rotation", "zindex", "flipped", "pinned"],
      },
      // Format 2: peach_preserves_username_photo_stockN_property
      ...(username
        ? [
            {
              prefix: `peach_preserves_${username}_${route}_photo_${id}_`,
              properties: [
                "position",
                "rotation",
                "zindex",
                "flipped",
                "pinned",
              ],
            },
          ]
        : []),
      // Format 3: peach_pos_stockN
      {
        key: `peach_pos_${id}`,
        format: "json",
      },
    ];

    // Combined data from all legacy formats
    const combinedData: StoredPhotoData = {};
    let foundAnyData = false;

    // Check prefix-based formats
    for (const format of legacyFormats) {
      if ("prefix" in format) {
        for (const prop of format.properties) {
          const key = `${format.prefix}${prop}`;
          const value = localStorage.getItem(key);

          if (value) {
            foundAnyData = true;

            switch (prop) {
              case "position":
                try {
                  combinedData.position = JSON.parse(value);
                } catch (e) {
                  console.error(
                    `[CANVAS STORAGE] Error parsing legacy position for ${id}:`,
                    e,
                  );
                }
                break;
              case "rotation":
                combinedData.rotation = parseFloat(value);
                break;
              case "zindex":
                combinedData.zIndex = parseInt(value, 10);
                break;
              case "flipped":
                combinedData.isFlipped = value === "true";
                break;
              case "pinned":
                combinedData.isPinned = value === "true";
                break;
            }
          }
        }
      } else if ("key" in format && format.format === "json") {
        // JSON format (like peach_pos_stockN)
        const value = localStorage.getItem(format.key);
        if (value) {
          try {
            const posData = JSON.parse(value);
            foundAnyData = true;

            if (posData.x !== undefined && posData.y !== undefined) {
              combinedData.position = { x: posData.x, y: posData.y };
            }
            if (posData.rotation !== undefined) {
              combinedData.rotation = posData.rotation;
            }
            if (posData.zIndex !== undefined) {
              combinedData.zIndex = posData.zIndex;
            }
          } catch (e) {
            console.error(
              `[CANVAS STORAGE] Error parsing legacy JSON for ${id}:`,
              e,
            );
          }
        }
      }
    }

    return foundAnyData ? combinedData : null;
  } catch (e) {
    console.error("[CANVAS STORAGE] Error in legacy data retrieval:", e);
    return null;
  }
}

/**
 * Save photo data to localStorage in the consolidated format
 * @param id Photo ID
 * @param data Photo data to save
 * @param route Route identifier ('login', 'dashboard', etc.)
 * @param username Optional username for user-specific storage
 */
export function savePhotoData(
  id: string,
  data: StoredPhotoData,
  route: string,
  username?: string,
): void {
  if (typeof window === "undefined") return;

  safeLocalStorage(
    () => {
      // Get storage key
      const key = getPhotoStorageKey(id, route, username);

      // Get existing data and merge with new data
      const existingData = getPhotoData(id, route, username) || {};
      const mergedData = { ...existingData, ...data };

      // Save consolidated data
      localStorage.setItem(key, JSON.stringify(mergedData));
      return true; // Return value for safeLocalStorage
    },
    false,
    "CANVAS STORAGE",
  );
}

/**
 * Helper function to get just the position property
 */
export function getPhotoPosition(
  id: string,
  route: string,
  username?: string,
): { x: number; y: number } | null {
  const data = getPhotoData(id, route, username);
  return data?.position || null;
}

/**
 * Helper function to get just the rotation property
 */
export function getPhotoRotation(
  id: string,
  route: string,
  username?: string,
): number | null {
  const data = getPhotoData(id, route, username);
  return data?.rotation !== undefined ? data.rotation : null;
}

/**
 * Helper function to get just the zIndex property
 */
export function getPhotoZIndex(
  id: string,
  route: string,
  username?: string,
): number | null {
  const data = getPhotoData(id, route, username);
  return data?.zIndex !== undefined ? data.zIndex : null;
}

/**
 * Helper function to save just the position property
 */
export function savePhotoPosition(
  id: string,
  position: { x: number; y: number },
  route: string,
  username?: string,
): void {
  savePhotoData(id, { position }, route, username);
}

/**
 * Helper function to save just the rotation property
 */
export function savePhotoRotation(
  id: string,
  rotation: number,
  route: string,
  username?: string,
): void {
  savePhotoData(id, { rotation }, route, username);
}

/**
 * Helper function to save just the zIndex property
 */
export function savePhotoZIndex(
  id: string,
  zIndex: number,
  route: string,
  username?: string,
): void {
  savePhotoData(id, { zIndex }, route, username);
}

/**
 * Helper function to save just the isFlipped property
 */
export function savePhotoFlipState(
  id: string,
  isFlipped: boolean,
  route: string,
  username?: string,
): void {
  savePhotoData(id, { isFlipped }, route, username);
}

/**
 * Helper function to save just the isPinned property
 */
export function savePinnedState(
  id: string,
  isPinned: boolean,
  route: string,
  username?: string,
): void {
  savePhotoData(id, { isPinned }, route, username);
}

/**
 * Initialize photos for canvas display with stored positions and properties
 * @param photos Base photo data to process
 * @param route Route identifier ('login', 'dashboard', etc.)
 * @param options Additional options for initialization
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
  },
): PolaroidPhoto[] {
  const {
    username,
    predefinedPositions = {},
    centerX = typeof window !== "undefined" ? window.innerWidth / 2 : 0,
    centerY = typeof window !== "undefined" ? window.innerHeight / 2 : 0,
  } = options || {};

  return photos.map((photo, index) => {
    // Get stored data
    const storedData = getPhotoData(photo.id, route, username);

    // Use predefined positions or calculate defaults
    const predefinedPosition = predefinedPositions[photo.id];

    // Calculate position - prioritize stored > predefined > calculated default
    const x =
      storedData?.position?.x ||
      predefinedPosition?.x ||
      centerX + Math.cos(index * 2.4) * Math.sqrt(index) * 80 - 110;

    const y =
      storedData?.position?.y ||
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
    const defaultZIndex = Math.max(
      0,
      Math.min(9, 9 - Math.floor((index / photos.length) * 10)),
    );
    const zIndex = storedData?.zIndex || defaultZIndex;

    // Use stored flip/pin states or defaults
    const isFlipped = storedData?.isFlipped || false;
    const isPinned = storedData?.isPinned || false;

    return {
      ...photo,
      position: { x, y },
      rotation,
      zIndex,
      flipped: isFlipped,
      isPinned,
    };
  });
}

/**
 * Store initial positions for photos if they don't exist yet
 * @param predefinedPositions Positions to store
 * @param route Route identifier
 * @param username Optional username
 */
export function storeInitialPositions(
  predefinedPositions: Record<string, { x: number; y: number }>,
  route: string,
  username?: string,
): void {
  if (typeof window === "undefined") return;

  Object.entries(predefinedPositions).forEach(([id, position]) => {
    try {
      // Only save if position doesn't already exist
      if (!getPhotoPosition(id, route, username)) {
        savePhotoPosition(id, position, route, username);
      }
    } catch (err) {
      console.error("[CANVAS STORAGE] Error saving initial position:", err);
    }
  });
}

export function cleanupPhotoStorage(): {
  originalEntries: number;
  consolidatedPhotos: number;
} {
  if (typeof window === "undefined") {
    return { originalEntries: 0, consolidatedPhotos: 0 };
  }

  logError("CLEANUP", "Starting photo storage cleanup process", {
    level: "info",
  });

  const allKeys = Object.keys(localStorage);
  console.log(`[CLEANUP] Found ${allKeys.length} total localStorage entries`);

  const photoKeys = allKeys.filter(
    (key) =>
      key.includes("peach_preserves_login_photo_") ||
      key.includes("peach_preserves_photo_") ||
      key.includes("peach_pos_"),
  );

  console.log(
    `[CLEANUP] Found ${photoKeys.length} photo-related localStorage entries`,
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
      data: StoredPhotoData;
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
          let data: StoredPhotoData = {};

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
              console.error(`[CLEANUP] Error parsing JSON for ${key}:`, e);
            }
          } else if (key.endsWith("_position")) {
            // Handle position property
            try {
              data.position = JSON.parse(localStorage.getItem(key) || "");
            } catch (e) {
              console.error(`[CLEANUP] Error parsing position for ${key}:`, e);
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
              console.error(`[CLEANUP] Error parsing data for ${key}:`, e);
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
      console.error(`[CLEANUP] Error processing key ${key}:`, e);
    }
  });

  // Remove all old entries
  photoKeys.forEach((key) => {
    localStorage.removeItem(key);
  });

  // Store consolidated entries
  photoMap.forEach(({ id, route, username, data }) => {
    savePhotoData(id, data, route, username);
  });

  console.log(
    `[CLEANUP] Consolidated ${photoKeys.length} entries into ${photoMap.size} photos`,
  );

  return {
    originalEntries: photoKeys.length,
    consolidatedPhotos: photoMap.size,
  };
}
