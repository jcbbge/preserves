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
  dashboardNavComponent: {
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

  // Dashboard nav component at same position as login for consistency
  dashboardNavComponent: {
    x: -130,
    y: -170,
  },

  // Stock photos arranged in a loose circular pattern around WORLD ORIGIN (0,0)
  // Positions adjusted for polaroid dimensions (260x300) - centers are positioned, then offset by half dimensions
  // These positions NEVER change regardless of login component position
  stockPhotos: {
    // Inner cluster - increased spread: roughly 350-480px radius
    stock1: { x: 300, y: -445 },  
    stock2: { x: 140, y: 40 },    
    stock3: { x: -340, y: -80 },  
    stock4: { x: -450, y: -320 }, 
    stock5: { x: -280, y: -580 }, 
    stock6: { x: 250, y: -500 },  

    // Outer cluster - increased spread: roughly 520-650px radius
    stock7: { x: 450, y: -220 },  
    stock8: { x: 360, y: 210 },   
    stock9: { x: -180, y: 330 },  
    stock10: { x: -550, y: 120 }, 
    stock11: { x: -620, y: -400 },
    stock12: { x: -450, y: -640 },
    stock13: { x: 180, y: -680 }, 
  },

  // Dashboard photos arranged in similar pattern around dashboard nav component
  dashboardPhotos: {
    // Inner cluster - adjusted spread: roughly 500-700px radius
    dashboard1: { x: 500, y: -600 },  
    dashboard2: { x: 350, y: 120 },    
    dashboard3: { x: -520, y: -180 },  
    dashboard4: { x: -650, y: -480 }, 
    dashboard5: { x: -450, y: -680 }, 
    dashboard6: { x: 480, y: -650 },  

    // Outer cluster - doubled spread: roughly 1040-1300px radius
    dashboard7: { x: 980, y: -480 },  
    dashboard8: { x: 800, y: 500 },   
    dashboard9: { x: -400, y: 740 },  
    dashboard10: { x: -1140, y: 320 }, 
    dashboard11: { x: -1280, y: -840 },
    dashboard12: { x: -940, y: -1320 },
    dashboard13: { x: 440, y: -1400 }, 
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

// Utility function to get oval/elliptical positions with more Y-axis spread
export function generateOvalPositions(
  count: number,
  radiusX: number,
  radiusY: number,
  startAngle: number = 0,
): { x: number; y: number }[] {
  const positions = [];
  const angleStep = (2 * Math.PI) / count;

  for (let i = 0; i < count; i++) {
    const angle = startAngle + i * angleStep;
    const x = Math.round(radiusX * Math.cos(angle));
    const y = Math.round(radiusY * Math.sin(angle));
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
