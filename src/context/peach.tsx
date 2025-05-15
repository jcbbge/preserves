import {
  createContext,
  useContext,
  JSX,
  createSignal,
  createMemo,
  onMount,
} from "solid-js";
import { createStore, Store } from "solid-js/store";

export interface PeachPost {
  id: string;
  createdTime: number;
  message?: string;
  media?: {
    type: "image" | "gif" | "video";
    url: string;
    width?: number;
    height?: number;
  }[];
  likeCount?: number;
  commentCount?: number;
  cursor?: string;
}

export interface UserStream {
  id: string;
  posts: PeachPost[];
  cursor?: string;
}

export interface PeachUser {
  id: string;
  username: string;
  sessionId: string;
  streams: UserStream[];
}

interface PeachContextValue {
  token: () => string | null;
  user: Store<{ data: PeachUser | null }>;
  isAuthenticated: () => boolean;
  login: (token: string, userData: any) => void;
  logout: () => void;
}

const PeachContext = createContext<PeachContextValue>();

export function PeachProvider(props: { children: JSX.Element }) {
  // Initialize from localStorage if available - with robust checking
  let savedToken = null;
  let parsedUserData = null;

  if (typeof window !== "undefined") {
    try {
      savedToken = localStorage.getItem("peach_token");

      const savedUserData = localStorage.getItem("peach_user");

      if (savedUserData) {
        parsedUserData = JSON.parse(savedUserData);
      }
    } catch (e) {
      console.error("[CONTEXT] Error restoring from localStorage:", e);
    }
  }

  const [token, setToken] = createSignal<string | null>(savedToken);
  const [user, setUser] = createStore<{ data: PeachUser | null }>({
    data: parsedUserData,
  });

  const isAuthenticated = createMemo(() => {
    const hasToken = Boolean(token());
    const hasUser = Boolean(user.data);

    return hasToken && hasUser;
  });

  const parseJWT = (token: string) => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(window.atob(base64));
    } catch (e) {
      console.error("Failed to parse JWT:", e);
      return null;
    }
  };

  const login = async (newToken: string, userData: any) => {
    try {
      if (!newToken) {
        throw new Error("No token provided");
      }

      const tokenData = parseJWT(newToken);
      console.log("[CONTEXT] Token data:", tokenData);
      console.log("[CONTEXT] Full userData:", userData);

      // CRITICAL FIX: Always use the stream token which is what the API needs
      const streamToken = userData?.streams?.[0]?.token;
      console.log("[CONTEXT] Auth token vs Stream token:", {
        authToken: newToken?.substring(0, 20) + "...",
        streamToken: streamToken?.substring(0, 20) + "...",
        match: newToken === streamToken,
      });

      // Use the stream token as the primary token if available
      const tokenToUse = streamToken || newToken;

      // Prepare user data object with consistent structure
      const userDataObj = {
        id: tokenData?.userID || "unknown",
        username: userData?.email || "unknown",
        sessionId: tokenData?.sessionID || "unknown",
        streams: userData?.streams || [],
      };

      // Update state - CRITICAL FIX: Use the stream token
      setToken(tokenToUse);
      setUser("data", userDataObj);

      // Save to localStorage - using try/catch for robustness
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("peach_token", tokenToUse);
          localStorage.setItem("peach_user", JSON.stringify(userDataObj));

          // Set cookie directly for server middleware authentication
          // Max age: 30 days in seconds
          document.cookie = `peach_token=${tokenToUse}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;

          // Verify localStorage was updated correctly
          const verifyToken = localStorage.getItem("peach_token");
          const verifyUser = localStorage.getItem("peach_user");
        } catch (e) {
          console.error("[CONTEXT] Error saving to localStorage:", e);
        }
      }
    } catch (error) {
      console.error("[CONTEXT] Error in login:", error);

      // Clear any partial data on error
      setToken(null);
      setUser("data", null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("peach_token");
        localStorage.removeItem("peach_user");
      }
    }
  };

  const logout = () => {
    // Clear state
    setToken(null);
    setUser("data", null);

    // Clear localStorage and cookie
    if (typeof window !== "undefined") {
      localStorage.removeItem("peach_token");
      localStorage.removeItem("peach_user");

      // Clear the cookie by setting its expiration in the past
      document.cookie = "peach_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      
      console.log("[CONTEXT] Cleared auth state, localStorage, and cookie");
    }
  };

  onMount(() => {});

  const value: PeachContextValue = {
    token,
    user,
    isAuthenticated,
    login,
    logout,
  };

  return (
    <PeachContext.Provider value={value}>
      {props.children}
    </PeachContext.Provider>
  );
}

export const usePeach = () => {
  const context = useContext(PeachContext);

  if (!context) {
    throw new Error("usePeach must be used within a PeachProvider");
  }
  return context;
};
