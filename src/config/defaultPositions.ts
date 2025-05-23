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
    position: { x: 400, y: 300 }, // Typical screen center for 800x600, will be recalculated
    scale: 1,
  },

  // Login component pinned at world origin (0,0) - same as red debugger +
  // The polaroid container's visual offset will be handled by CSS positioning
  loginComponent: {
    x: -130,
    y: -170,
  },

  // Stock photos arranged in a loose circular pattern around WORLD ORIGIN (0,0)
  // Positions adjusted for polaroid dimensions (260x300) - centers are positioned, then offset by half dimensions
  // These positions NEVER change regardless of login component position
  stockPhotos: {
    // Inner cluster - roughly 250-380px radius with random variations, adjusted for polaroid centering
    stock1: { x: 200, y: -345 },  // 330 - 130, -195 - 150
    stock2: { x: 90, y: -10 },    // 220 - 130, 140 - 150
    stock3: { x: -240, y: -80 },  // -110 - 130, 70 - 150
    stock4: { x: -350, y: -220 }, // -220 - 130, -70 - 150
    stock5: { x: -180, y: -480 }, // -50 - 130, -330 - 150
    stock6: { x: 150, y: -400 },  // 280 - 130, -250 - 150

    // Outer cluster - roughly 420-550px radius with random variations, adjusted for polaroid centering
    stock7: { x: 350, y: -120 },  // 480 - 130, 30 - 150
    stock8: { x: 260, y: 110 },   // 390 - 130, 260 - 150
    stock9: { x: -80, y: 230 },   // 50 - 130, 380 - 150
    stock10: { x: -450, y: 20 },  // -320 - 130, 170 - 150
    stock11: { x: -520, y: -300 }, // -390 - 130, -150 - 150
    stock12: { x: -350, y: -540 }, // -220 - 130, -390 - 150
    stock13: { x: 80, y: -580 },  // 210 - 130, -430 - 150
  },
};

// Utility function to get circular positions
export function generateCircularPositions(
  count: number,
  radius: number,
  startAngle: number = 0,
): { x: number; y: number }[] {
  const positions = [];
  const angleStep = (2 * Math.PI) / count;

  for (let i = 0; i < count; i++) {
    const angle = startAngle + i * angleStep;
    const x = Math.round(radius * Math.cos(angle));
    const y = Math.round(radius * Math.sin(angle));
    positions.push({ x, y });
  }

  return positions;
}

// Get viewport position that centers world origin (0,0) on screen
// This centers both the red debugger + and login component
export function getViewportForLoginCenter(
  screenWidth: number,
  screenHeight: number,
) {
  const centerX = screenWidth / 2;
  const centerY = screenHeight / 2;

  return {
    position: {
      x: centerX,
      y: centerY,
    },
    scale: DEFAULT_POSITIONS.viewport.scale,
  };
}
