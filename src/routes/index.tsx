import { query } from "@solidjs/router";
import { useNavigate } from "@solidjs/router";
import { Show, createSignal, onMount, For } from "solid-js";
import { usePeach } from "~/context/peach";
import { Title } from "@solidjs/meta";
import { createStore, produce } from "solid-js/store";
import styles from "./index.module.css";
import { 
  preprocessPolaroidPhotos, 
  seededRandom, 
  generatePolaroidStyles,
  getPhotoPositionFromStorage,
  getPhotoRotationFromStorage,
  savePhotoPositionToStorage,
  savePhotoRotationToStorage,
  savePhotoZIndexToStorage,
  touchToMouseEvent,
  generateTransformString,
  getHighestPolaroidZIndex
} from "~/utils/photoUtils";
import { PolaroidPhoto } from "~/types/polaroid";



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

  // Use localStorage helper functions
  const getStoredPhotoPosition = (id: string) => {
    try {
      return getPhotoPositionFromStorage(id, storageKeyPrefix);
    } catch (e) {
      console.error("[LOGIN] Error loading stored photo position:", e);
      return null;
    }
  };

  const getStoredPhotoRotation = (id: string) => {
    try {
      return getPhotoRotationFromStorage(id, storageKeyPrefix);
    } catch (e) {
      console.error("[LOGIN] Error loading stored photo rotation:", e);
      return null;
    }
  };

  // Initialize polaroid positions with a pleasing arrangement
  const initializePolaroidPositions = () => {
    // Use the preprocessing function to prepare the polaroid photos
    const photos = preprocessPolaroidPhotos(stockImages, {
      predefinedPositions,
      storageKeyPrefix,
      centerX: window.innerWidth / 2,
      centerY: window.innerHeight / 2,
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
          savePhotoPositionToStorage(id, position, storageKeyPrefix);
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

    // Bring to front, but stay within polaroid range (0-9)
    const currentZIndices = polaroidPhotos.map((p) => p.zIndex || 0);
    const highestPolaroidZIndex = getHighestPolaroidZIndex(currentZIndices);
    const newZIndex = Math.min(9, highestPolaroidZIndex + 1);

    // Update z-index in store
    setPolaroidPhotos(
      (p) => p.id === id,
      produce((photo) => {
        photo.zIndex = newZIndex;
      }),
    );
    
    // Save z-index to localStorage
    savePhotoZIndexToStorage(id, newZIndex, storageKeyPrefix);
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
      element.style.transform = generateTransformString(x, y, rotation);
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

    // Save position and rotation to localStorage
    savePhotoPositionToStorage(id, { x, y }, storageKeyPrefix);
    
    // Get the current rotation value from the store
    const photo = polaroidPhotos.find(p => p.id === id);
    if (photo?.rotation) {
      savePhotoRotationToStorage(id, photo.rotation, storageKeyPrefix);
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
        const mouseEvent = touchToMouseEvent(e, 'mousemove');
        handleDragMove(mouseEvent);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (draggedPhoto()) {
        e.preventDefault();
        const mouseEvent = touchToMouseEvent(e, 'mouseup');
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
            // Get deterministic style values for this photo
            const { textAngle, textX, textY, dateAngle, dateX, dateY, bgColor } = generatePolaroidStyles(photo.id);

            return (
              <div
                id={`photo-${photo.id}`}
                class={`${styles.polaroid} ${styles["background-polaroid"]}`}
                style={{
                  transform: generateTransformString(photo.position?.x || 0, photo.position?.y || 0, photo.rotation || 0),
                  "z-index": photo.zIndex || 1,
                  background: bgColor,
                }}
                onMouseDown={(e) => handleDragStart(e, photo.id)}
                onTouchStart={(e) => {
                  if (e.touches.length === 1) {
                    e.preventDefault();
                    const mouseEvent = touchToMouseEvent(e, 'mousedown');
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
        <div class={styles["login-container"]} style={{ "z-index": 60 }}>
          {/* Login polaroid */}
          <div class={`${styles.polaroid} ${styles["login-polaroid"]}`} style={{ "z-index": 70 }}>
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
            style={{ "z-index": 55 }}
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
