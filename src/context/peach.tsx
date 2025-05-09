import { createContext, useContext, JSX, createSignal, createMemo, onMount } from "solid-js";
import { createStore, Store } from "solid-js/store";

export interface PeachPost {
  id: string;
  createdTime: number;
  message?: string;
  media?: {
    type: 'image' | 'gif' | 'video';
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
console.log('[CONTEXT] PeachContext created');

export function PeachProvider(props: { children: JSX.Element }) {
  console.log('[CONTEXT] PeachProvider rendering');
  
  // Initialize from localStorage if available - with robust checking
  let savedToken = null;
  let parsedUserData = null;
  
  if (typeof window !== 'undefined') {
    try {
      savedToken = localStorage.getItem('peach_token');
      console.log('[CONTEXT] Found token in localStorage:', savedToken ? 'present' : 'missing');
      
      const savedUserData = localStorage.getItem('peach_user');
      console.log('[CONTEXT] Found user data in localStorage:', savedUserData ? 'present' : 'missing');
      
      if (savedUserData) {
        parsedUserData = JSON.parse(savedUserData);
        console.log('[CONTEXT] Restored user data from localStorage:', {
          id: parsedUserData?.id || 'missing',
          username: parsedUserData?.username || 'missing',
          sessionId: parsedUserData?.sessionId || 'missing',
          hasStreams: Boolean(parsedUserData?.streams?.length)
        });
      }
    } catch (e) {
      console.error('[CONTEXT] Error restoring from localStorage:', e);
    }
  }
  
  const [token, setToken] = createSignal<string | null>(savedToken);
  const [user, setUser] = createStore<{ data: PeachUser | null }>({ 
    data: parsedUserData 
  });

  const isAuthenticated = createMemo(() => {
    const hasToken = Boolean(token());
    const hasUser = Boolean(user.data);
    console.log('[CONTEXT] Authentication check:', { hasToken, hasUser });
    return hasToken && hasUser;
  });

  const parseJWT = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(window.atob(base64));
    } catch (e) {
      console.error('Failed to parse JWT:', e);
      return null;
    }
  };

  const login = (newToken: string, userData: any) => {
    console.log('[CONTEXT] login called with token and data', {
      tokenPresent: Boolean(newToken),
      userDataKeys: userData ? Object.keys(userData) : 'no data'
    });

    try {
      if (!newToken) {
        throw new Error('No token provided');
      }
      
      const tokenData = parseJWT(newToken);
      console.log('[CONTEXT] Token data:', tokenData);
      console.log('[CONTEXT] Full userData:', userData);

      // CRITICAL FIX: Always use the stream token which is what the API needs
      const streamToken = userData?.streams?.[0]?.token;
      console.log('[CONTEXT] Auth token vs Stream token:', { 
        authToken: newToken?.substring(0, 20) + '...',
        streamToken: streamToken?.substring(0, 20) + '...',
        match: newToken === streamToken
      });
      
      // Use the stream token as the primary token if available
      const tokenToUse = streamToken || newToken;
      console.log('[CONTEXT] Using token for context:', tokenToUse?.substring(0, 20) + '...');
      
      // Prepare user data object with consistent structure
      const userDataObj = {
        id: tokenData?.userID || 'unknown',
        username: userData?.email || 'unknown',
        sessionId: tokenData?.sessionID || 'unknown',
        streams: userData?.streams || []
      };

      console.log('[CONTEXT] Prepared user data object:', userDataObj);
      
      // Update state - CRITICAL FIX: Use the stream token
      setToken(tokenToUse);
      setUser('data', userDataObj);

      // Save to localStorage - using try/catch for robustness
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('peach_token', tokenToUse);
          localStorage.setItem('peach_user', JSON.stringify(userDataObj));
          console.log('[CONTEXT] Saved authentication data to localStorage successfully');
          
          // Verify it was saved correctly
          const verifyToken = localStorage.getItem('peach_token');
          const verifyUser = localStorage.getItem('peach_user');
          console.log('[CONTEXT] Verified localStorage save:', {
            tokenSaved: Boolean(verifyToken),
            userSaved: Boolean(verifyUser)
          });
        } catch (e) {
          console.error('[CONTEXT] Error saving to localStorage:', e);
        }
      }
      
      console.log('[CONTEXT] User data set successfully - isAuthenticated:', isAuthenticated());
    } catch (error) {
      console.error('[CONTEXT] Error in login:', error);
      
      // Clear any partial data on error
      setToken(null);
      setUser('data', null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('peach_token');
        localStorage.removeItem('peach_user');
      }
    }
  };

  const logout = () => {
    console.log('[CONTEXT] logout called');
    
    // Clear state
    setToken(null);
    setUser('data', null);
    
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('peach_token');
      localStorage.removeItem('peach_user');
      console.log('[CONTEXT] Cleared authentication data from localStorage');
    }
  };

  onMount(() => {
    console.log('[CONTEXT] PeachProvider mounted');
  });

  const value: PeachContextValue = {
    token,
    user,
    isAuthenticated,
    login,
    logout
  };

  return (
    <PeachContext.Provider value={value}>
      {props.children}
    </PeachContext.Provider>
  );
}

export const usePeach = () => {
  const context = useContext(PeachContext);
  console.log('[CONTEXT] usePeach called', context);
  if (!context) {
    throw new Error("usePeach must be used within a PeachProvider");
  }
  return context;
};
