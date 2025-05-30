/**
 * Simplified storage utility for Peach Preserves
 * Handles localStorage with minimal API for photos, canvas, user data, and posts
 */

// Types
export interface PhotoState {
  x: number;
  y: number;
  rotation: number;
  zIndex: number;
  isExposed?: boolean;
}

export interface CanvasState {
  x: number;
  y: number;
  scale: number;
}

export interface UserData {
  username: string;
  token: string;
  screenName?: string;
  avatar?: string;
  bio?: string;
}

export interface PostData {
  id: string;
  type: 'image' | 'text';
  src?: string;
  caption?: string;
  date: string;
}

// Storage keys
const GUEST_PHOTOS_KEY = 'peach_guest_photos';
const GUEST_CANVAS_KEY = 'peach_guest_canvas';

function getUserPhotosKey(username: string): string {
  return `peach_${username}_photos`;
}

function getUserCanvasKey(username: string): string {
  return `peach_${username}_canvas`;
}

function getUserDataKey(username: string): string {
  return `peach_${username}_user`;
}

function getUserPostsKey(username: string): string {
  return `peach_${username}_posts`;
}

// Helper functions
function safeGet<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (err) {
    console.error(`[STORAGE] Error loading ${key}:`, err);
    return defaultValue;
  }
}

function safeSet<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`[STORAGE] Error saving ${key}:`, err);
  }
}

// Photos storage
export function getPhotos(username?: string): Record<string, PhotoState> {
  const key = username ? getUserPhotosKey(username) : GUEST_PHOTOS_KEY;
  return safeGet(key, {});
}

export function setPhotos(photos: Record<string, PhotoState>, username?: string): void {
  const key = username ? getUserPhotosKey(username) : GUEST_PHOTOS_KEY;
  safeSet(key, photos);
}

export function setPhotoPosition(photoId: string, x: number, y: number, username?: string): void {
  const photos = getPhotos(username);
  if (!photos[photoId]) {
    photos[photoId] = { x, y, rotation: 0, zIndex: 1, isExposed: false };
  } else {
    photos[photoId].x = x;
    photos[photoId].y = y;
  }
  setPhotos(photos, username);
}

export function setPhotoState(photoId: string, state: Partial<PhotoState>, username?: string): void {
  const photos = getPhotos(username);
  if (!photos[photoId]) {
    photos[photoId] = { x: 0, y: 0, rotation: 0, zIndex: 1, isExposed: false };
  }
  Object.assign(photos[photoId], state);
  setPhotos(photos, username);
}

// Canvas storage
export function getCanvas(username?: string): CanvasState | null {
  const key = username ? getUserCanvasKey(username) : GUEST_CANVAS_KEY;
  return safeGet<CanvasState | null>(key, null);
}

export function setCanvas(canvas: CanvasState, username?: string): void {
  const key = username ? getUserCanvasKey(username) : GUEST_CANVAS_KEY;
  safeSet(key, canvas);
}

// User data storage
export function getUserData(username: string): UserData | null {
  const key = getUserDataKey(username);
  return safeGet<UserData | null>(key, null);
}

export function setUserData(userData: UserData): void {
  const key = getUserDataKey(userData.username);
  safeSet(key, userData);
}

// Posts storage
export function getPosts(username: string): PostData[] {
  const key = getUserPostsKey(username);
  return safeGet(key, []);
}

export function setPosts(posts: PostData[], username: string): void {
  const key = getUserPostsKey(username);
  safeSet(key, posts);
}

// Utility functions
export function clearUserData(username: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(getUserPhotosKey(username));
    localStorage.removeItem(getUserCanvasKey(username));
    localStorage.removeItem(getUserDataKey(username));
    localStorage.removeItem(getUserPostsKey(username));
  } catch (err) {
    console.error(`[STORAGE] Error clearing data for ${username}:`, err);
  }
}

export function clearGuestData(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(GUEST_PHOTOS_KEY);
    localStorage.removeItem(GUEST_CANVAS_KEY);
  } catch (err) {
    console.error('[STORAGE] Error clearing guest data:', err);
  }
}