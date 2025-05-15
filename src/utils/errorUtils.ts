/**
 * Unified error handling utilities for Peach Preserves
 * Provides consistent error handling, logging, and display
 */

// Error categories
export enum ErrorCategory {
  AUTH = 'AUTH',
  NETWORK = 'NETWORK',
  STORAGE = 'STORAGE',
  API = 'API',
  UI = 'UI',
  UNKNOWN = 'UNKNOWN'
}

// Custom error class with category and user-friendly message
export class AppError extends Error {
  category: ErrorCategory;
  userMessage: string;
  
  constructor(
    message: string,
    options: {
      category?: ErrorCategory,
      userMessage?: string,
      cause?: unknown
    } = {}
  ) {
    super(message, { cause: options.cause });
    this.name = "AppError";
    this.category = options.category || ErrorCategory.UNKNOWN;
    this.userMessage = options.userMessage || "An unexpected error occurred";
  }
}

// Consistent logging format with context
export function logError(
  context: string,
  error: unknown,
  details?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();
  const errorObj = error instanceof Error ? error : new Error(String(error));
  
  // Format prefix for all log entries
  const prefix = `[${timestamp}] [ERROR] [${context}]`;
  
  // Build structured log data
  const logData = {
    message: errorObj.message,
    stack: errorObj.stack,
    ...(details || {})
  };
  
  // Log to console with consistent format
  console.error(`${prefix}:`, logData);
  
  // In development, also log the raw error for easier debugging
  if (process.env.NODE_ENV !== 'production') {
    console.error(`${prefix} Raw error:`, error);
  }
}

// Extract user-friendly message from any error type
export function getUserErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.userMessage;
  }
  
  if (error instanceof Error) {
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return "Network connection issue. Please check your internet connection and try again.";
    }
    
    if (error.message.includes('permission') || error.message.includes('denied')) {
      return "Permission denied. You may need to log in again.";
    }
    
    // Generic but somewhat helpful message including original error text
    return `Error: ${error.message}`;
  }
  
  return "An unexpected error occurred";
}

// Try-catch wrapper for localStorage operations
export function safeLocalStorage<T>(
  operation: () => T,
  fallback: T,
  context = 'STORAGE'
): T {
  try {
    return operation();
  } catch (error) {
    logError(context, error, { operation: 'localStorage' });
    return fallback;
  }
}

// Helper for handling async operations with consistent error handling
export async function handleAsyncOperation<T>(
  operation: () => Promise<T>,
  options: {
    context: string;
    onError?: (error: unknown) => void;
    fallback?: T;
    rethrow?: boolean;
  }
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    logError(options.context, error);
    
    if (options.onError) {
      options.onError(error);
    }
    
    if (options.rethrow) {
      throw error;
    }
    
    return options.fallback;
  }
}

// Retry mechanism for API calls or other operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    backoffFactor?: number;
    context: string;
    onRetry?: (attempt: number, error: unknown) => void;
  }
): Promise<T> {
  const {
    retries = 3,
    delay = 1000,
    backoffFactor = 1.5,
    context,
    onRetry
  } = options;
  
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Log the error
      logError(context, error, { 
        attempt, 
        remaining: retries - attempt 
      });
      
      // No more retries left
      if (attempt >= retries) {
        break;
      }
      
      // Notify if callback provided
      if (onRetry) {
        onRetry(attempt + 1, error);
      }
      
      // Wait before the next retry with exponential backoff
      const waitTime = delay * Math.pow(backoffFactor, attempt);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  // If we get here, all retries failed
  throw new AppError(
    `Operation failed after ${retries + 1} attempts`,
    {
      category: ErrorCategory.NETWORK,
      userMessage: "Failed to complete the operation. Please try again later.",
      cause: lastError
    }
  );
}