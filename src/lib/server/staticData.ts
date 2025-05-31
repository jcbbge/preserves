import { query } from "@solidjs/router";
import { stockImages, predefinedPositions } from "~/data/stockImages";
import { DEFAULT_POSITIONS } from "~/config/defaultPositions";

/**
 * Server function to get static canvas data including stock images,
 * predefined positions, and default positions for the login page.
 * 
 * This data is static and can be cached across navigation.
 * 
 * @returns Promise<StaticCanvasData> Static data for canvas initialization
 */
export const getStaticCanvasData = query(async () => {
  "use server";
  
  try {
    return {
      stockImages,
      predefinedPositions,
      defaultPositions: DEFAULT_POSITIONS
    };
  } catch (error) {
    console.error("[SERVER] Error fetching static canvas data:", error);
    throw new Error("Failed to fetch static canvas data");
  }
}, "getStaticCanvasData");

export interface StaticCanvasData {
  stockImages: typeof stockImages;
  predefinedPositions: typeof predefinedPositions;
  defaultPositions: typeof DEFAULT_POSITIONS;
}