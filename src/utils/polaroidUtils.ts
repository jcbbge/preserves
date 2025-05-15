/**
 * Core utility functions for polaroid-style photos
 * Consolidated from photoUtils.ts with duplicate code removed
 */

import { PolaroidPhoto } from "~/types/polaroid";

/**
 * Generate a CSS transform string for a polaroid
 */
export function generateTransformString(
  x: number = 0, 
  y: number = 0, 
  rotation: number = 0
): string {
  return `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg)`;
}

/**
 * Z-index utilities - determine z-index ranges and get highest value
 */
export function isUIElementZIndex(zIndex: number): boolean {
  return zIndex >= 50 && zIndex <= 100;
}

export function getHighestPolaroidZIndex(zIndices: number[]): number {
  const polaroidZIndices = zIndices.filter(z => !isUIElementZIndex(z));
  return polaroidZIndices.length ? Math.min(9, Math.max(...polaroidZIndices)) : 0;
}

/**
 * Interface for touch-to-mouse event conversion options
 */
export interface TouchToMouseOptions {
  clientX: number;
  clientY: number;
  bubbles?: boolean;
  cancelable?: boolean;
  view?: Window;
  buttons?: number;
}

/**
 * Function to generate consistent random values based on seed
 * Used for deterministic visual variations
 */
export function seededRandom(seed: string, min: number, max: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 956789);
  }
  h = h & h; // Convert to 32bit integer
  return min + ((h % 1000) / 1000) * (max - min);
}

/**
 * Generate deterministic visual styles for a polaroid
 */
export function generatePolaroidStyles(id: string) {
  const textAngle = seededRandom(`${id}_text_angle`, -2, 2);
  const textX = seededRandom(`${id}_text_x`, -3, 3);
  const textY = seededRandom(`${id}_text_y`, -2, 2);
  const dateAngle = seededRandom(`${id}_date_angle`, -2, 2);
  const dateX = seededRandom(`${id}_date_x`, -3, 3);
  const dateY = seededRandom(`${id}_date_y`, -2, 2);

  // Subtle background color variations
  const bgColors = ["#f8f6f1", "#f6f3e9", "#f7f5ed", "#f3f0e7"];
  const bgIndex = Math.floor(
    seededRandom(`${id}_bg`, 0, bgColors.length),
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

/**
 * Convert a TouchEvent to a MouseEvent
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

/**
 * Calculate natural-looking default positions for a grid of photos
 */
export function calculateDefaultPositions(
  count: number, 
  options: {
    centerX?: number;
    centerY?: number;
    radius?: number;
    randomness?: number;
  } = {}
): Array<{x: number, y: number}> {
  const {
    centerX = typeof window !== "undefined" ? window.innerWidth / 2 : 500,
    centerY = typeof window !== "undefined" ? window.innerHeight / 2 : 400,
    radius = 80,
    randomness = 0.2
  } = options;
  
  const positions = [];
  
  for (let i = 0; i < count; i++) {
    // Use cosine and sine to distribute photos in a spiral pattern
    const angle = i * 2.4; // Increasing the multiplier spreads the photos further apart
    const distance = Math.sqrt(i) * radius;
    
    // Add slight randomness for a natural scattered look
    const randomX = (Math.random() - 0.5) * 2 * distance * randomness;
    const randomY = (Math.random() - 0.5) * 2 * distance * randomness;
    
    const x = centerX + Math.cos(angle) * distance + randomX - 110; // Offset for polaroid size
    const y = centerY + Math.sin(angle) * distance + randomY - 135; // Offset for polaroid size
    
    positions.push({ x, y });
  }
  
  return positions;
}