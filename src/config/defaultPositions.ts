// Default positions for Peach Preserves infinite canvas
// All positions are in world space coordinates (not screen space)

export interface DefaultPositions {
  viewport: {
    position: { x: number; y: number };
    scale: number;
  };
  loginComponent: {
    x: number;
    y: number;
  };
  stockPhotos: {
    [key: string]: { x: number; y: number };
  };
}

// World space origin (0,0) represents the center of our canvas universe
// Login component is placed at the origin for easy navigation
// Stock photos are arranged in a circular pattern around the login component
export const DEFAULT_POSITIONS: DefaultPositions = {
  // Viewport defaults - centers the view on the login component
  viewport: {
    position: { x: 0, y: 0 }, // World origin at screen center
    scale: 1,
  },

  // Login component positioned at world origin
  loginComponent: {
    x: 0,
    y: 0,
  },

  // Stock photos arranged in concentric circles around login component
  // Inner circle: radius 400px, outer circle: radius 650px
  stockPhotos: {
    // Inner circle - 6 photos at radius 400
    stock1: { x: 400, y: 0 },                    // East
    stock2: { x: 200, y: 346 },                  // Southeast  
    stock3: { x: -200, y: 346 },                 // Southwest
    stock4: { x: -400, y: 0 },                   // West
    stock5: { x: -200, y: -346 },                // Northwest
    stock6: { x: 200, y: -346 },                 // Northeast

    // Outer circle - 7 photos at radius 650  
    stock7: { x: 650, y: 0 },                    // East
    stock8: { x: 456, y: 464 },                  // Southeast
    stock9: { x: 0, y: 650 },                    // South
    stock10: { x: -456, y: 464 },                // Southwest
    stock11: { x: -650, y: 0 },                  // West
    stock12: { x: -456, y: -464 },               // Northwest
    stock13: { x: 0, y: -650 },                  // North
  },
};

// Utility function to get circular positions
export function generateCircularPositions(
  count: number,
  radius: number,
  startAngle: number = 0
): { x: number; y: number }[] {
  const positions = [];
  const angleStep = (2 * Math.PI) / count;
  
  for (let i = 0; i < count; i++) {
    const angle = startAngle + (i * angleStep);
    const x = Math.round(radius * Math.cos(angle));
    const y = Math.round(radius * Math.sin(angle));
    positions.push({ x, y });
  }
  
  return positions;
}

// Get viewport position that centers the login component on screen
export function getViewportForLoginCenter(screenWidth: number, screenHeight: number) {
  return {
    position: {
      x: screenWidth / 2 - DEFAULT_POSITIONS.loginComponent.x,
      y: screenHeight / 2 - DEFAULT_POSITIONS.loginComponent.y,
    },
    scale: DEFAULT_POSITIONS.viewport.scale,
  };
}