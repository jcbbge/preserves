import { PolaroidPhoto } from "~/types/polaroid";
import { predefinedPositions as defaultPredefinedPositions } from "~/data/stockImages";

/**
 * Generate a CSS transform string for a polaroid
 * @param x X position
 * @param y Y position
 * @param rotation Rotation in degrees
 * @returns CSS transform string
 */
export function generateTransformString(
  x: number = 0, 
  y: number = 0, 
  rotation: number = 0
): string {
  return `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg)`;
}

/**
 * Determine if a z-index value is within the UI element range (50-100)
 * @param zIndex Z-index value to check
 * @returns true if in UI element range, false if in polaroid range (0-10)
 */
export function isUIElementZIndex(zIndex: number): boolean {
  return zIndex >= 50 && zIndex <= 100;
}

/**
 * Get the highest z-index in the polaroid range (0-10)
 * @param zIndices Array of current z-indices 
 * @returns The highest polaroid z-index (max 9)
 */
export function getHighestPolaroidZIndex(zIndices: number[]): number {
  const polaroidZIndices = zIndices.filter(z => !isUIElementZIndex(z));
  return polaroidZIndices.length ? Math.min(9, Math.max(...polaroidZIndices)) : 0;
}

// Interface for touch-to-mouse event conversion options
export interface TouchToMouseOptions {
  clientX: number;
  clientY: number;
  bubbles?: boolean;
  cancelable?: boolean;
  view?: Window;
  buttons?: number;
}

// Function to generate consistent random values based on seed
export function seededRandom(seed: string, min: number, max: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 956789);
  }
  h = h & h; // Convert to 32bit integer
  return min + ((h % 1000) / 1000) * (max - min);
}

// Generate deterministic visual styles for a polaroid
export function generatePolaroidStyles(id: string) {
  const seed = id;
  const textAngle = seededRandom(`${seed}_text_angle`, -2, 2);
  const textX = seededRandom(`${seed}_text_x`, -3, 3);
  const textY = seededRandom(`${seed}_text_y`, -2, 2);
  const dateAngle = seededRandom(`${seed}_date_angle`, -2, 2);
  const dateX = seededRandom(`${seed}_date_x`, -3, 3);
  const dateY = seededRandom(`${seed}_date_y`, -2, 2);

  // Subtle background color variations
  const bgColors = ["#f8f6f1", "#f6f3e9", "#f7f5ed", "#f3f0e7"];
  const bgIndex = Math.floor(
    seededRandom(`${seed}_bg`, 0, bgColors.length),
  );
  const bgColor = bgColors[bgIndex];

  return {
    textAngle,
    textX,
    textY,
    dateAngle,
    dateX,
    dateY,
    bgColor
  };
}

// Helper functions for localStorage operations

/**
 * Get a photo's position from localStorage
 * @param id Photo ID
 * @param storageKeyPrefix Prefix for the localStorage key
 * @returns The stored position or null if not found
 */
export function getPhotoPositionFromStorage(id: string, storageKeyPrefix = "peach_preserves_login_") {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(
      `${storageKeyPrefix}photo_${id}_position`,
    );
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    console.error("[UTILS] Error loading stored photo position:", e);
    return null;
  }
}

/**
 * Get a photo's rotation from localStorage
 * @param id Photo ID
 * @param storageKeyPrefix Prefix for the localStorage key
 * @returns The stored rotation or null if not found
 */
export function getPhotoRotationFromStorage(id: string, storageKeyPrefix = "peach_preserves_login_") {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(
    `${storageKeyPrefix}photo_${id}_rotation`,
  );
  return stored ? parseFloat(stored) : null;
}

/**
 * Get a photo's z-index from localStorage
 * @param id Photo ID
 * @param storageKeyPrefix Prefix for the localStorage key
 * @returns The stored z-index or null if not found
 */
export function getPhotoZIndexFromStorage(id: string, storageKeyPrefix = "peach_preserves_login_") {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(
    `${storageKeyPrefix}photo_${id}_zindex`,
  );
  return stored ? parseInt(stored, 10) : null;
}

/**
 * Save a photo's position to localStorage
 * @param id Photo ID
 * @param position Position object with x and y coordinates
 * @param storageKeyPrefix Prefix for the localStorage key
 */
export function savePhotoPositionToStorage(
  id: string, 
  position: { x: number; y: number },
  storageKeyPrefix = "peach_preserves_login_"
) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `${storageKeyPrefix}photo_${id}_position`,
      JSON.stringify(position),
    );
  } catch (err) {
    console.error("[UTILS] Error saving position:", err);
  }
}

/**
 * Save a photo's rotation to localStorage
 * @param id Photo ID
 * @param rotation Rotation value in degrees
 * @param storageKeyPrefix Prefix for the localStorage key
 */
export function savePhotoRotationToStorage(
  id: string,
  rotation: number,
  storageKeyPrefix = "peach_preserves_login_"
) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `${storageKeyPrefix}photo_${id}_rotation`,
      rotation.toString(),
    );
  } catch (err) {
    console.error("[UTILS] Error saving rotation:", err);
  }
}

/**
 * Save a photo's z-index to localStorage
 * @param id Photo ID
 * @param zIndex Z-index value
 * @param storageKeyPrefix Prefix for the localStorage key
 */
export function savePhotoZIndexToStorage(
  id: string,
  zIndex: number,
  storageKeyPrefix = "peach_preserves_login_"
) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `${storageKeyPrefix}photo_${id}_zindex`,
      zIndex.toString(),
    );
  } catch (err) {
    console.error("[UTILS] Error saving z-index:", err);
  }
}

/**
 * Convert a TouchEvent to a MouseEvent
 * @param touchEvent The original touch event
 * @param eventType The mouse event type to create (mousedown, mousemove, mouseup)
 * @param touchIndex Which touch to use (default: 0 for first touch)
 * @returns A simulated MouseEvent with the touch coordinates
 */
export function touchToMouseEvent(
  touchEvent: TouchEvent, 
  eventType: 'mousedown' | 'mousemove' | 'mouseup',
  touchIndex = 0
): MouseEvent {
  const touch = eventType === 'mouseup' 
    ? touchEvent.changedTouches[touchIndex] 
    : touchEvent.touches[touchIndex];
    
  const options: TouchToMouseOptions = {
    clientX: touch.clientX,
    clientY: touch.clientY,
    bubbles: true,
    cancelable: true,
    view: window,
  };
  
  // Add buttons property for mousemove events
  if (eventType === 'mousemove') {
    options.buttons = 1;
  }
  
  return new MouseEvent(eventType, options) as MouseEvent;
}

// Pre-process a collection of photos to add positioning, rotation, and visual effects
export function preprocessPolaroidPhotos(
  imageData: { id: string; src: string; caption: string; date: string }[],
  options?: {
    predefinedPositions?: Record<string, { x: number; y: number }>;
    storageKeyPrefix?: string;
    centerX?: number;
    centerY?: number;
  }
): PolaroidPhoto[] {
  const photos: PolaroidPhoto[] = [];
  
  // Default options
  const {
    predefinedPositions = {},
    storageKeyPrefix = "peach_preserves_login_",
    centerX = typeof window !== "undefined" ? window.innerWidth / 2 : 0,
    centerY = typeof window !== "undefined" ? window.innerHeight / 2 : 0,
  } = options || {};

  // Process each image
  imageData.forEach((image, index) => {
    const storedPosition = getPhotoPositionFromStorage(image.id, storageKeyPrefix);
    const storedRotation = getPhotoRotationFromStorage(image.id, storageKeyPrefix);
    const storedZIndex = getPhotoZIndexFromStorage(image.id, storageKeyPrefix);
    
    // Use predefined positions or fallback to calculated position
    const predefinedPosition = predefinedPositions[image.id];

    // Calculate position - prioritize user's stored positions over predefined ones
    const x =
      storedPosition?.x ||
      predefinedPosition?.x ||
      centerX + Math.cos(index * 2.4) * Math.sqrt(index) * 80 - 110;
    const y =
      storedPosition?.y ||
      predefinedPosition?.y ||
      centerY + Math.sin(index * 2.4) * Math.sqrt(index) * 80 - 135;

    // Use small random rotation for natural look
    const rotation = storedRotation || seededRandom(image.id, -10, 10);

    // Use stored z-index or default, keeping within the 0-10 range for photos
    // We map the photo index to a value between 0-10, with higher indices getting lower z-index values
    const defaultZIndex = Math.max(0, Math.min(9, 9 - Math.floor((index / imageData.length) * 10)));
    const zIndex = storedZIndex || defaultZIndex;

    photos.push({
      ...image,
      position: { x, y },
      rotation,
      zIndex,
      // No flip state
    });
  });

  return photos;
}

/**
 * Initialize polaroid photos for display
 * @param imageData Source image data
 * @param options Configuration options
 * @returns Processed polaroid photos ready for display
 */
export function initializePolaroidPhotos(
  imageData: { id: string; src: string; caption: string; date: string }[],
  options?: {
    predefinedPositions?: Record<string, { x: number; y: number }>;
    storageKeyPrefix?: string;
    centerX?: number;
    centerY?: number;
  }
) {
  // Set default centerX and centerY if window is available
  const defaultOptions = {
    predefinedPositions: defaultPredefinedPositions,
    storageKeyPrefix: "peach_preserves_login_",
    centerX: typeof window !== "undefined" ? window.innerWidth / 2 : 0,
    centerY: typeof window !== "undefined" ? window.innerHeight / 2 : 0,
  };

  // Merge provided options with defaults
  const mergedOptions = { ...defaultOptions, ...options };

  // Process photos and return them
  return preprocessPolaroidPhotos(imageData, mergedOptions);
}

/**
 * Store initial positions to localStorage if they don't exist yet
 * @param predefinedPositions The predefined positions to store
 * @param storageKeyPrefix The prefix for localStorage keys
 */
export function storeInitialPositions(
  predefinedPositions = defaultPredefinedPositions,
  storageKeyPrefix = "peach_preserves_login_"
) {
  if (typeof window === "undefined") return;
  
  Object.entries(predefinedPositions).forEach(([id, position]) => {
    try {
      // Only save if position doesn't already exist
      if (!localStorage.getItem(`${storageKeyPrefix}photo_${id}_position`)) {
        savePhotoPositionToStorage(id, position, storageKeyPrefix);
      }
    } catch (err) {
      console.error("[UTILS] Error saving initial position:", err);
    }
  });
}