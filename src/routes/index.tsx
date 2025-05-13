import { query } from "@solidjs/router";
import { useNavigate } from "@solidjs/router";
import { Show, createSignal, onMount, For } from "solid-js";
import { usePeach } from "~/context/peach";
import { Title } from "@solidjs/meta";
import { createStore, produce } from "solid-js/store";
import styles from "./index.module.css";

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
    stock1: { x: 796, y: 632.5 },
    stock2: { x: 812.2606284458755, y: 181.04631805511508 },
    stock3: { x: 422.3742249073924, y: -109.37895001717351 },
    stock4: { x: 680.3695385621181, y: 730.967306452139 },
    stock5: { x: -17.937571158825392, y: 641.6346437554041 },
    stock6: { x: 707.6914814808155, y: 46.51864804656071 },
    stock7: { x: 92.35800509573659, y: 810.0368818696267 },
    stock8: { x: 46.11590233770039, y: -17.328164275597544 },
    stock9: { x: 693.651630471095, y: 883.6041257004499 },
    stock10: { x: -48.34153247423609, y: 107.87514749648301 },
    stock11: { x: 757.1371798814184, y: -149.86902237054204 },
    stock12: { x: 387.1332206033734, y: 843.0005601461124 },
    stock13: { x: 336.35871498447614, y: -106.32491281242051 },
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
            JSON.stringify(position),
          );
        }
      } catch (err) {
        console.error("[LOGIN] Error saving initial position:", err);
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
    <div class={styles["peach-preserve"]}>
      <Title>Peach Preserves</Title>

      <div ref={setCorkboardRef} class={styles.corkboard}>
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
                class={`${styles.polaroid} ${styles["background-polaroid"]}`}
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
                <div class={styles["polaroid-image-area"]}>
                  <img
                    src={photo.src}
                    alt="Polaroid photo"
                    class={styles["polaroid-photo"]}
                  />
                  <div class={styles["polaroid-grit-overlay"]}></div>
                </div>
                <div class={styles["polaroid-caption"]}>
                  <span
                    class={styles["polaroid-handwritten"]}
                    style={{
                      display: "inline-block",
                      transform: `rotate(${textAngle}deg) translate(${textX}px, ${textY}px)`,
                    }}
                  >
                    {photo.caption}
                  </span>
                  <span
                    class={`${styles["polaroid-handwritten"]} ${styles.date}`}
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
        <div class={styles["login-container"]}>
          {/* Login polaroid */}
          <div class={`${styles.polaroid} ${styles["login-polaroid"]}`}>
            <div
              class={`${styles["polaroid-image-area"]} ${styles["login-image-area"]}`}
            >
              <img
                src="/peachdotcool.png"
                alt="Peach"
                class={styles["login-logo"]}
              />
              <div class={styles["polaroid-grit-overlay"]}></div>
            </div>
            <div class={styles["polaroid-caption"]}>
              <form onSubmit={handleSubmit} class={styles["login-form"]}>
                <div class={styles["input-wrapper"]}>
                  <input
                    type="text"
                    id="email"
                    name="email"
                    placeholder="email / username"
                    required
                    disabled={loading()}
                    class={styles["handwritten-input"]}
                  />
                  <input
                    type="password"
                    id="password"
                    name="password"
                    placeholder="password"
                    required
                    disabled={loading()}
                    class={styles["handwritten-input"]}
                  />
                </div>
                {error() && (
                  <div
                    class={`${styles["error-message"]} ${styles["polaroid-handwritten"]}`}
                  >
                    {error()}
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Connect button polaroid */}
          <button
            type="submit"
            class={`${styles.polaroid} ${styles["connect-polaroid"]}`}
            onClick={() =>
              document
                .querySelector("form")
                ?.dispatchEvent(new Event("submit", { cancelable: true }))
            }
            disabled={loading()}
          >
            <div
              class={`${styles["polaroid-image-area"]} ${styles["connect-image-area"]}`}
            >
              <div class={styles["connect-photo"]}>
                {loading() ? "Connecting..." : "Connect"}
              </div>
              <div class={styles["arrow-down-container"]}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
                  <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" />
                </svg>
              </div>
              <div class={styles["polaroid-grit-overlay"]}></div>
            </div>
            <div class={styles["polaroid-caption"]}>
              <span
                class={`${styles["polaroid-handwritten"]} ${styles["connect-text"]}`}
              >
                Connect Peach Account
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
