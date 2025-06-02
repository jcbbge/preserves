import {
  createContext,
  useContext,
  JSX,
  createSignal,
  createMemo,
} from "solid-js";
import { createStore, Store } from "solid-js/store";
import { getUserData, setUserData, clearUserData, UserData } from "~/utils/storage";

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
  // Peach API fields
  name?: string;
  displayName?: string;
  avatarSrc?: string;
  bio?: string;
}

interface PeachContextValue {
  token: () => string | null;
  user: Store<{ data: PeachUser | null }>;
  isAuthenticated: () => boolean;
  login: (token: string, userData: any) => void;
  logout: () => void;
  updateUserData: (userData: any) => void;
}

// Auth storage - now handled through new storage system

const PeachContext = createContext<PeachContextValue>();

export function PeachProvider(props: { children: JSX.Element }) {
  // Initialize from localStorage using new storage system
  const [token, setToken] = createSignal<string | null>(null);
  const [user, setUser] = createStore<{ data: PeachUser | null }>({
    data: null,
  });

  // Try to restore session from any stored user data
  if (typeof window !== 'undefined') {
    // Look for any stored user data to restore session
    const allKeys = Object.keys(localStorage);
    const userDataKey = allKeys.find(key => key.startsWith('peach_') && key.endsWith('_user'));
    
    
    if (userDataKey) {
      const username = userDataKey.replace('peach_', '').replace('_user', '');
      const userData = getUserData(username);
      
      
      if (userData) {
        setToken(userData.token);
        const restoredUserData = {
          id: userData.id || userData.username,
          username: userData.username,
          sessionId: "restored",
          streams: [],
          // Restore all Peach API fields
          name: userData.name,
          displayName: userData.displayName,
          avatarSrc: userData.avatarSrc,
          bio: userData.bio,
        };
        setUser("data", restoredUserData);
      }
    }
  }

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
      console.error("[AUTH] Failed to parse JWT:", e);
      return null;
    }
  };

  const login = async (newToken: string, userData: any) => {
    try {
      if (!newToken) {
        throw new Error("No token provided");
      }

      const tokenData = parseJWT(newToken);
      console.log("[AUTH] Processing login data");
      console.log("[AUTH] userData received:", userData);
      console.log("[AUTH] userData keys:", Object.keys(userData || {}));

      // Always use the stream token which is what the API needs
      const streamToken = userData?.streams?.[0]?.token;

      // Use the stream token as the primary token if available
      const tokenToUse = streamToken || newToken;

      // Prepare user data object with consistent structure
      const userDataObj = {
        id: tokenData?.userID || userData?.id || "unknown",
        username: userData?.email || "unknown",
        sessionId: tokenData?.sessionID || "unknown",
        streams: userData?.streams || [],
        // Store Peach API fields directly in user object
        name: userData?.name,
        displayName: userData?.displayName,
        avatarSrc: userData?.avatarSrc,
        bio: userData?.bio,
      };

      // Update state
      setToken(tokenToUse);
      setUser("data", userDataObj);

      // Save to localStorage using new storage system
      const userStorageData: UserData = {
        username: userDataObj.username,
        token: tokenToUse,
        screenName: userData?.screenName,
        avatar: userData?.avatar,
        bio: userData?.bio,
        // Store Peach API specific fields
        name: userData?.name,
        displayName: userData?.displayName,
        avatarSrc: userData?.avatarSrc,
        id: userData?.id
      };
      setUserData(userStorageData);

      // Set cookie for server middleware authentication (30 days)
      document.cookie = `peach_token=${tokenToUse}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;

      console.log("[AUTH] Login successful");
    } catch (error) {
      console.error("[AUTH] Error in login:", error);

      // Clear any partial data on error
      setToken(null);
      setUser("data", null);

      // Clear storage - remove user data if we know the username
      if (user.data?.username) {
        clearUserData(user.data.username);
      }

      // Clear cookie
      document.cookie = "peach_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    }
  };

  const logout = () => {
    // Clear state
    setToken(null);
    setUser("data", null);

    // Clear storage using new system
    if (user.data?.username) {
      clearUserData(user.data.username);
    }

    // Clear the cookie
    document.cookie = "peach_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";

    console.log("[AUTH] Logged out");
  };

  const updateUserData = (userData: any) => {
    setUser("data", existing => ({
      ...existing,
      displayName: userData.displayName,
      bio: userData.bio,
      avatarSrc: userData.avatarSrc,
      name: userData.name,
      id: userData.id,
    }));

    // Also update localStorage
    if (user.data?.username) {
      const currentUserData = getUserData(user.data.username);
      if (currentUserData) {
        const updatedUserData: UserData = {
          ...currentUserData,
          displayName: userData.displayName,
          bio: userData.bio,
          avatarSrc: userData.avatarSrc,
          name: userData.name,
          id: userData.id,
        };
        setUserData(updatedUserData);
      }
    }
  };

  const value: PeachContextValue = {
    token,
    user,
    isAuthenticated,
    login,
    logout,
    updateUserData,
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
