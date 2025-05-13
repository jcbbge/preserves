import { query } from "@solidjs/router";
import { useNavigate } from "@solidjs/router";
import { Show, createSignal, onMount, For } from "solid-js";
import { usePeach } from "~/context/peach";
import { Title } from "@solidjs/meta";
import { createStore, produce } from "solid-js/store";

// Function to generate consistent random values based on seed
function seededRandom(seed: string, min: number, max: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  const x = Math.abs(Math.sin(h) * 10000) % 1;
  return min + x * (max - min);
}

// Server action for login - handles API call server-side to avoid CORS
const connect = query(async (formData: FormData) => {
  "use server";

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    console.error("[SERVER] MISSING CREDENTIALS - THIS IS THE PROBLEM");
    return {
      success: false,
      error: "Email and password are required",
    };
  }

  try {
    const requestBody = {
      email: email,
      password: password,
    };

    const response = await fetch("https://v1.peachapi.com/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    // Check for API error response
    if (data.success === 0) {
      console.error("[SERVER] API returned error:", data.error);
      throw new Error(data.error?.Message || "Authentication failed");
    }

    // Log data structure to debug
    console.log("[SERVER] Data keys:", Object.keys(data));
    if (data.data) {
      console.log("[SERVER] data.data keys:", Object.keys(data.data));
    }

    // Get the token from data.data.token
    const authToken = data.data?.token;

    if (!authToken) {
      console.error("[SERVER] Could not find token in response");
      throw new Error("No authentication token in response");
    }

    return {
      success: true,
      token: authToken,
      email,
      userData: data.data,
    };
  } catch (error) {
    console.error("[SERVER] Authentication error with full details:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Authentication failed",
    };
  }
}, "login");

// Stock image data for background polaroids
const stockImages = [
  {
    id: "stock1",
    src: "/login_images/post_3f2f3114_img_00.jpg",
    caption: "Summer vacation 2022",
    date: "07/15/2022",
  },
  {
    id: "stock2",
    src: "/login_images/post_47d25085_img_04.jpg",
    caption: "My favorite spot",
    date: "03/22/2022",
  },
  {
    id: "stock3",
    src: "/login_images/post_5d89f6b9_img_02.jpg",
    caption: "Weekend getaway",
    date: "06/10/2022",
  },
  {
    id: "stock4",
    src: "/login_images/post_6f486030_img_03.jpg",
    caption: "Perfect morning",
    date: "04/05/2022",
  },
  {
    id: "stock5",
    src: "/login_images/post_6fc8c951_img_03.jpg",
    caption: "Missing this view",
    date: "09/18/2022",
  },
  {
    id: "stock6",
    src: "/login_images/post_71f234d2_img_00.jpg",
    caption: "Lunch with friends",
    date: "05/30/2022",
  },
  {
    id: "stock7",
    src: "/login_images/post_78512145_img_00.jpg",
    caption: "My new plant baby",
    date: "02/14/2022",
  },
  {
    id: "stock8",
    src: "/login_images/post_7e85815f_img_00.jpg",
    caption: "The perfect coffee",
    date: "08/21/2022",
  },
  {
    id: "stock9",
    src: "/login_images/post_88b2fe64_img_00.jpg",
    caption: "Art gallery visit",
    date: "11/05/2022",
  },
  {
    id: "stock10",
    src: "/login_images/post_c096b3d9_img_06.jpg",
    caption: "Exploring downtown",
    date: "10/12/2022",
  },
  {
    id: "stock11",
    src: "/login_images/post_ce1bf6e5_img_10.jpg",
    caption: "Fresh baked cookies",
    date: "12/24/2022",
  },
  {
    id: "stock12",
    src: "/login_images/post_da12f6c5_img_00.jpg",
    caption: "Sunset walks",
    date: "07/07/2022",
  },
  {
    id: "stock13",
    src: "/login_images/post_ec040e09_img_00.jpg",
    caption: "Cozy afternoon",
    date: "01/16/2022",
  },
];

// Polaroid photo interface
interface PolaroidPhoto {
  id: string;
  src: string;
  caption: string;
  date: string;
  position?: { x: number; y: number };
  rotation?: number;
  zIndex?: number;
  flipped?: boolean;
}

export default function Home() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = usePeach();

  const [error, setError] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [corkboardRef, setCorkboardRef] = createSignal<HTMLDivElement>();
  const [polaroidPhotos, setPolaroidPhotos] = createStore<PolaroidPhoto[]>([]);

  // Drag state
  const [draggedPhoto, setDraggedPhoto] = createSignal<string | null>(null);
  const [dragStartX, setDragStartX] = createSignal(0);
  const [dragStartY, setDragStartY] = createSignal(0);
  const [initialPhotoX, setInitialPhotoX] = createSignal(0);
  const [initialPhotoY, setInitialPhotoY] = createSignal(0);

  // Predefined positions for stock images
  const predefinedPositions = {
    "stock1": { x: 796, y: 632.5 },
    "stock2": { x: 812.2606284458755, y: 181.04631805511508 },
    "stock3": { x: 422.3742249073924, y: -109.37895001717351 },
    "stock4": { x: 680.3695385621181, y: 730.967306452139 },
    "stock5": { x: -17.937571158825392, y: 641.6346437554041 },
    "stock6": { x: 707.6914814808155, y: 46.51864804656071 },
    "stock7": { x: 92.35800509573659, y: 810.0368818696267 },
    "stock8": { x: 46.11590233770039, y: -17.328164275597544 },
    "stock9": { x: 693.651630471095, y: 883.6041257004499 },
    "stock10": { x: -48.34153247423609, y: 107.87514749648301 },
    "stock11": { x: 757.1371798814184, y: -149.86902237054204 },
    "stock12": { x: 387.1332206033734, y: 843.0005601461124 },
    "stock13": { x: 336.35871498447614, y: -106.32491281242051 }
  };

  // Storage key for persistable state
  const storageKeyPrefix = "peach_preserves_login_";

  // Helper functions for localStorage
  const getStoredPhotoPosition = (id: string) => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(
        `${storageKeyPrefix}photo_${id}_position`,
      );
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error("[LOGIN] Error loading stored photo position:", e);
      return null;
    }
  };

  const getStoredPhotoRotation = (id: string) => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(
      `${storageKeyPrefix}photo_${id}_rotation`,
    );
    return stored ? parseFloat(stored) : null;
  };

  // No longer needed
  const getStoredPhotoFlipped = () => false;

  // Initialize polaroid positions with a pleasing arrangement
  const initializePolaroidPositions = () => {
    const photos: PolaroidPhoto[] = [];

    // Get center of viewport
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // Define max spread to keep things in view
    // This value can be adjusted to control how wide the photos are spread
    const spreadX = Math.min(window.innerWidth * 0.7, 650);
    const spreadY = Math.min(window.innerHeight * 0.7, 550);

    stockImages.forEach((image, index) => {
      const storedPosition = getStoredPhotoPosition(image.id);
      const storedRotation = getStoredPhotoRotation(image.id);
      // No longer using flipped state
      
      // Use predefined positions or fallback to calculated position
      const predefinedPosition = predefinedPositions[image.id];
      
      // Calculate position - prioritize user's stored positions over predefined ones
      const x = storedPosition?.x || predefinedPosition?.x || (centerX + Math.cos(index * 2.4) * Math.sqrt(index) * 80 - 110);
      const y = storedPosition?.y || predefinedPosition?.y || (centerY + Math.sin(index * 2.4) * Math.sqrt(index) * 80 - 135);

      // Use small random rotation for natural look
      const rotation = storedRotation || seededRandom(image.id, -10, 10);

      photos.push({
        ...image,
        position: { x, y },
        rotation,
        zIndex: stockImages.length - index,
        // No flip state
      });
    });

    setPolaroidPhotos(photos);
  };

  // Redirect if already authenticated
  const redirectIfAuthenticated = () => {
    if (isAuthenticated()) {
      console.log("[INDEX] User authenticated, redirecting to dashboard");
      setTimeout(() => navigate("/dashboard"), 0);
    }
  };

  // Store initial positions to localStorage only if they don't exist yet
  const storeInitialPositions = () => {
    Object.entries(predefinedPositions).forEach(([id, position]) => {
      try {
        // Only save if position doesn't already exist
        if (!localStorage.getItem(`${storageKeyPrefix}photo_${id}_position`)) {
          localStorage.setItem(
            `${storageKeyPrefix}photo_${id}_position`,
            JSON.stringify(position)
          );
        }
      } catch (err) {
        console.error('[LOGIN] Error saving initial position:', err);
      }
    });
  };

  // Use onMount to ensure we don't redirect during SSR
  onMount(() => {
    redirectIfAuthenticated();
    initializePolaroidPositions();
    storeInitialPositions();
  });

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.target as HTMLFormElement;
    const formData = new FormData();

    // Get input values directly
    const emailInput = form.querySelector("#email") as HTMLInputElement;
    const passwordInput = form.querySelector("#password") as HTMLInputElement;

    if (emailInput && passwordInput) {
      formData.set("email", emailInput.value);
      formData.set("password", passwordInput.value);
    } else {
      console.error("[CLIENT] COULD NOT FIND FORM INPUTS!");
    }

    try {
      const result = await connect(formData);

      if (result.success && result.token) {
        login(result.token, { ...result.userData, email: result.email });
        navigate("/dashboard");
      } else {
        console.log("[CLIENT] Login failed:", result.error);
        setError(
          result.error ||
            "Failed to connect to Peach. Please check your credentials.",
        );
      }
    } catch (error) {
      console.error("[CLIENT] Unexpected error during login:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      console.log("[CLIENT] Login attempt completed");
      setLoading(false);
    }
  };

  // Removed flip handler

  // Handle drag start
  const handleDragStart = (e: MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Find the photo
    const photo = polaroidPhotos.find((p) => p.id === id);
    if (!photo) return;

    // Get the DOM element
    const element = document.getElementById(`photo-${id}`);
    if (!element) return;

    // Get initial positions for this drag operation
    setDragStartX(e.clientX);
    setDragStartY(e.clientY);
    setInitialPhotoX(photo.position?.x || 0);
    setInitialPhotoY(photo.position?.y || 0);

    // Start dragging
    setDraggedPhoto(id);

    // Add styling
    element.classList.add("dragging");

    // Enable GPU acceleration
    element.style.willChange = "transform";

    // Bring to front
    const newZIndex = Math.max(...polaroidPhotos.map((p) => p.zIndex || 0)) + 1;

    // Update z-index in store
    setPolaroidPhotos(
      (p) => p.id === id,
      produce((photo) => {
        photo.zIndex = newZIndex;
      }),
    );
  };

  // Handle drag movement
  const handleDragMove = (e: MouseEvent) => {
    const id = draggedPhoto();
    if (!id) return;

    // If mouse released, end drag
    if (e.buttons === 0) {
      handleDragEnd(e);
      return;
    }

    // Get element
    const element = document.getElementById(`photo-${id}`);
    if (!element) return;

    // Calculate position delta from drag start
    const deltaX = e.clientX - dragStartX();
    const deltaY = e.clientY - dragStartY();

    // Apply new position to element directly for immediate feedback
    const x = initialPhotoX() + deltaX;
    const y = initialPhotoY() + deltaY;

    // Get rotation from store
    const photo = polaroidPhotos.find((p) => p.id === id);
    const rotation = photo?.rotation || 0;

    // Request animation frame for smoother updates
    requestAnimationFrame(() => {
      // Update transform directly (instant feedback)
      element.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg)`;
    });
  };

  // Handle drag end
  const handleDragEnd = (e: MouseEvent) => {
    const id = draggedPhoto();
    if (!id) return;

    // Calculate final position
    const deltaX = e.clientX - dragStartX();
    const deltaY = e.clientY - dragStartY();
    const x = initialPhotoX() + deltaX;
    const y = initialPhotoY() + deltaY;

    // Get element
    const element = document.getElementById(`photo-${id}`);
    if (element) {
      element.classList.remove("dragging");
      element.style.willChange = "auto";
    }

    // Clear drag state
    setDraggedPhoto(null);

    // Update position in store
    setPolaroidPhotos(
      (p) => p.id === id,
      produce((photo) => {
        if (!photo.position) photo.position = { x: 0, y: 0 };
        photo.position.x = x;
        photo.position.y = y;
      }),
    );

    // Save to localStorage
    try {
      localStorage.setItem(
        `${storageKeyPrefix}photo_${id}_position`,
        JSON.stringify({ x, y }),
      );
    } catch (err) {
      console.error("[LOGIN] Error saving position:", err);
    }
  };

  // Add mouse and touch event listeners
  onMount(() => {
    // Global event listeners
    const handleMove = (e: MouseEvent) => handleDragMove(e);
    const handleUp = (e: MouseEvent) => handleDragEnd(e);

    // Touch event handlers
    const handleTouchMove = (e: TouchEvent) => {
      if (draggedPhoto() && e.touches.length === 1) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent("mousemove", {
          clientX: touch.clientX,
          clientY: touch.clientY,
          bubbles: true,
          cancelable: true,
          view: window,
          buttons: 1,
        }) as any;
        handleDragMove(mouseEvent);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (draggedPhoto()) {
        e.preventDefault();
        const touch = e.changedTouches[0];
        const mouseEvent = new MouseEvent("mouseup", {
          clientX: touch.clientX,
          clientY: touch.clientY,
          bubbles: true,
          cancelable: true,
          view: window,
        }) as any;
        handleDragEnd(mouseEvent);
      }
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  });

  return (
    <div class="peach-preserve">
      <Title>Peach Preserves</Title>

      <div ref={setCorkboardRef} class="corkboard">
        {/* Background polaroids */}
        <For each={polaroidPhotos}>
          {(photo) => {
            // Get deterministic random values based on photo ID for unique look
            const seed = photo.id;
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

            return (
              <div
                id={`photo-${photo.id}`}
                class="polaroid background-polaroid"
                style={{
                  transform: `translate3d(${photo.position?.x || 0}px, ${photo.position?.y || 0}px, 0) rotate(${photo.rotation || 0}deg)`,
                  "z-index": photo.zIndex || 1,
                  background: bgColor,
                }}
                onMouseDown={(e) => handleDragStart(e, photo.id)}
                onTouchStart={(e) => {
                  if (e.touches.length === 1) {
                    e.preventDefault();
                    const touch = e.touches[0];
                    const mouseEvent = new MouseEvent("mousedown", {
                      clientX: touch.clientX,
                      clientY: touch.clientY,
                      bubbles: true,
                      cancelable: true,
                      view: window,
                    }) as any;
                    handleDragStart(mouseEvent, photo.id);
                  }
                }}
              >
                <div class="polaroid-image-area">
                  <img
                    src={photo.src}
                    alt="Polaroid photo"
                    class="polaroid-photo"
                  />
                  <div class="polaroid-grit-overlay"></div>
                </div>
                <div class="polaroid-caption">
                  <span
                    class="polaroid-handwritten"
                    style={{
                      display: "inline-block",
                      transform: `rotate(${textAngle}deg) translate(${textX}px, ${textY}px)`,
                    }}
                  >
                    {photo.caption}
                  </span>
                  <span
                    class="polaroid-handwritten date"
                    style={{
                      display: "inline-block",
                      transform: `rotate(${dateAngle}deg) translate(${dateX}px, ${dateY}px)`,
                    }}
                  >
                    {photo.date}
                  </span>
                </div>
              </div>
            );
          }}
        </For>

        {/* Login container (center of screen) */}
        <div class="login-container">
          {/* Login polaroid */}
          <div class="polaroid login-polaroid">
            <div class="polaroid-image-area login-image-area">
              <img
                src="/peachdotcool.png"
                alt="Peach"
                class="login-logo"
                style="object-position: center;"
              />
              <div class="polaroid-grit-overlay"></div>
            </div>
            <div class="polaroid-caption">
              <form onSubmit={handleSubmit} class="login-form">
                <div class="input-wrapper">
                  <input
                    type="text"
                    id="email"
                    name="email"
                    placeholder="email / username"
                    required
                    disabled={loading()}
                    class="handwritten-input"
                  />
                  <input
                    type="password"
                    id="password"
                    name="password"
                    placeholder="password"
                    required
                    disabled={loading()}
                    class="handwritten-input"
                  />
                </div>
                {error() && (
                  <div class="error-message polaroid-handwritten">
                    {error()}
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Connect button polaroid */}
          <button
            type="submit"
            class="polaroid connect-polaroid"
            onClick={() =>
              document
                .querySelector("form")
                ?.dispatchEvent(new Event("submit", { cancelable: true }))
            }
            disabled={loading()}
          >
            <div class="polaroid-image-area connect-image-area">
              <div class="connect-photo">
                {loading() ? "Connecting..." : "Connect"}
              </div>
              <div class="arrow-down-container">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
                  <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" />
                </svg>
              </div>
              <div class="polaroid-grit-overlay"></div>
            </div>
            <div class="polaroid-caption">
              <span class="polaroid-handwritten connect-text">
                Connect Peach Account
              </span>
            </div>
          </button>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap');

        :root {
          --peach-primary: #FF9A8B;
          --peach-secondary: #FF6B6B;
          --peach-accent: #FFCBC1;
          --peach-background: #FFF4F2;
          --peach-dark: #E86C5D;
          --text-dark: #4A3F3A;
          --text-light: #FFFFFF;
          --error-color: #FF4D4D;
          --transition-duration: 300ms;
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .peach-preserve {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
          background-color: #f5f0e5; /* Cork board color */
        }

        .corkboard {
          flex: 1;
          background-color: #f5f0e5; /* Cork board color */
          background-image: radial-gradient(
              rgba(160, 120, 90, 0.1) 15%,
              transparent 16%
            ),
            radial-gradient(rgba(160, 120, 90, 0.1) 15%, transparent 16%);
          background-size: 10px 10px;
          background-position:
            0 0,
            5px 5px;
          position: relative;
          width: 100%;
          height: 100vh;
          overflow: hidden;
          user-select: none;
          touch-action: none;
        }

        /* Login container - centered */
        .login-container {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 260px;
          height: 350px;
          z-index: 1000;
          perspective: 1000px;
        }

        /* Common polaroid styling */
        .polaroid {
          width: 260px;
          height: 300px;
          background: #fff;
          box-shadow: 0 8px 24px rgba(0,0,0,0.18);
          border-radius: 2px;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 12px 35px 12px;
          box-sizing: border-box;
          transition: box-shadow 0.2s;
          transform: translate3d(0, 0, 0);
          touch-action: none;
        }

        /* Background polaroid specific */
        .background-polaroid {
          position: absolute;
          top: 0;
          left: 0;
          cursor: grab;
          transform-style: preserve-3d;
          backface-visibility: hidden;
          touch-action: none;
          -webkit-tap-highlight-color: transparent;
        }

        .polaroid.dragging {
          box-shadow: 0 12px 32px rgba(0,0,0,0.28);
          cursor: grabbing !important;
          z-index: 1000 !important;
          transition: none !important;
        }

        /* Removed flip styles */

        /* Removed front/back styles - now using direct elements */

        .polaroid-image-area {
          width: 100%;
          height: 220px;
          position: relative;
          overflow: hidden;
          border-radius: 1px;
          margin-bottom: 6px;
          background: #f7f7f7;
        }

        .polaroid-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .polaroid-grit-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: url('data:image/svg+xml;utf8,<svg width="250" height="250" xmlns="http://www.w3.org/2000/svg"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="250" height="250" filter="url(%23noise)" opacity="0.4"/></svg>');
          opacity: 0.1;
          mix-blend-mode: multiply;
          pointer-events: none;
        }

        .polaroid-caption {
          width: 100%;
          text-align: center;
          height: 35px; /* Fixed small height for caption */
          display: flex;
          align-items: center;
          justify-content: center;
          padding-top: 0;
        }
        
        /* Specific override for login polaroid caption */
        .login-polaroid .polaroid-caption {
          height: auto;
          min-height: 45px;
          padding: 4px 0;
        }

        .polaroid-handwritten {
          font-family: 'Caveat', cursive;
          color: #333;
          line-height: 1.2;
          font-size: 1.2rem;
        }

        .polaroid-handwritten.date {
          font-size: 0.9rem;
          color: #666;
        }

        /* Removed back content styles */

        /* Login polaroid styling */
        .login-polaroid {
          position: absolute;
          transform: rotate(-3deg);
          z-index: 20;
          box-shadow: 0 12px 36px rgba(0,0,0,0.25);
          padding-bottom: 0; /* Remove bottom padding for login polaroid */
        }

        .login-image-area {
          display: flex;
          background: var(--peach-background);
          overflow: hidden;
          padding: 0;
          margin-bottom: 6px;
          height: 210px; /* Reduced height for more caption space */
        }

        .login-logo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          padding: 0;
        }

        .login-form {
          width: 100%;
          display: flex;
          justify-content: center;
        }

        .input-wrapper {
          display: flex;
          flex-direction: column;
          gap: 5px;
          width: 90%;
          margin: 0 auto;
        }

        .handwritten-input {
          width: 100%;
          padding: 0;
          height: 22px;
          background-color: transparent;
          border: none;
          border-bottom: 1px dashed #999;
          border-radius: 0; /* Remove any rounded edges */
          font-family: 'Caveat', cursive;
          font-size: 1.1rem;
          color: #333;
          transition: border-color 0.2s;
          margin: 0;
          box-sizing: border-box;
        }

        .handwritten-input::placeholder {
          color: #999;
        }

        .handwritten-input:focus {
          outline: none;
          border-bottom-color: var(--peach-primary);
        }

        .handwritten-input:disabled {
          opacity: 0.7;
        }

        .error-message {
          position: absolute;
          bottom: -20px;
          left: 50%;
          transform: translateX(-50%) rotate(-1deg);
          color: var(--error-color);
          font-size: 0.8rem;
          background: rgba(255, 255, 255, 0.95);
          padding: 2px 8px;
          border-radius: 4px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.15);
          white-space: nowrap;
          max-width: 250px;
          z-index: 30;
        }

        /* Connect button polaroid */
        .connect-polaroid {
          position: absolute;
          top: 10px;
          left: 10px;
          transform: translateY(100px) translateX(80px) rotate(5deg);
          z-index: 10;
          border: none;
          cursor: pointer;
          background: #fff;
          transition: transform 0.2s, box-shadow 0.2s;
          width: 230px;
          height: 270px;
        }

        .connect-polaroid:hover:not(:disabled) {
          transform: translateY(100px) translateX(80px) rotate(5deg) scale(1.03);
          box-shadow: 0 15px 30px rgba(0,0,0,0.25);
        }

        .connect-polaroid:active:not(:disabled) {
          transform: translateY(100px) translateX(80px) rotate(5deg) scale(0.98);
        }

        .connect-polaroid:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .connect-image-area {
          background: linear-gradient(45deg, var(--peach-secondary), var(--peach-primary));
        }

        .connect-photo {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Caveat', cursive;
          font-size: 2rem;
          font-weight: bold;
          color: white;
        }

        .arrow-down-container {
          position: absolute;
          right: 8px;
          bottom: 8px;
          width: 24px;
          height: 24px;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          padding: 2px;
        }

        .connect-text {
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}
