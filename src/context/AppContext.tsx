import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';
import { fetchSystemStats } from '../services/apiClient';

interface AppContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  user: any;
  profile: UserProfile | null;
  setProfile: (profile: UserProfile | null) => void;
  loading: boolean;
  backendReady: boolean;
  lastSyncedTime: string;
  appSearchQuery: string;
  setAppSearchQuery: (query: string) => void;
  selectedOppId: string | null;
  setSelectedOppId: (id: string | null) => void;
  viewOpportunity: (id: string, title?: string) => void;
  clearSelectedOpportunity: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendReady, setBackendReady] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [lastSyncedTime, setLastSyncedTime] = useState(new Date().toLocaleTimeString());
  const [appSearchQuery, setAppSearchQuery] = useState('');
  const lastConnectedRef = useRef(typeof navigator !== 'undefined' && navigator.onLine ? Date.now() : 0);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('yuvahub-theme');
    if (savedTheme) {
      return savedTheme === 'dark' ? 'dark' : 'light';
    }
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  const [selectedOppId, setSelectedOppId] = useState<string | null>(() => {
    const oppMatch = window.location.pathname.match(/^\/opportunity\/([^/]+)/);
    return oppMatch ? oppMatch[1] : null;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('yuvahub-theme', theme);
  }, [theme]);

  useEffect(() => {
    const verifyFeedEndpoint = async () => {
      try {
        const response = await fetch("/api/v1/opportunities");
        const text = await response.text();
        try {
          JSON.parse(text);
        } catch {}
      } catch (err) {
        console.error(`[Verify Feed] Error:`, err);
      }
    };
    verifyFeedEndpoint();

    const checkBackend = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setBackendReady(false);
        return;
      }
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }

      const stats = await fetchSystemStats();
      if (stats) {
        lastConnectedRef.current = Date.now();
        setBackendReady(prev => {
          if (!prev) return true;
          return prev;
        });
        setLastSyncedTime(new Date().toLocaleTimeString());
      } else {
        const timeSinceLastConnect = Date.now() - lastConnectedRef.current;
        if (timeSinceLastConnect >= 2000) {
          setBackendReady(prev => {
            if (prev) return false;
            return prev;
          });
        }
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 60000);

    const handleBackendStatus = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newStatus = customEvent.detail.online;
      const timestamp = customEvent.detail.timestamp || Date.now();

      if (newStatus) {
        lastConnectedRef.current = timestamp;
        setBackendReady(prev => {
          if (!prev) return true;
          return prev;
        });
        setLastSyncedTime(new Date().toLocaleTimeString());
      } else {
        const timeSinceLastConnect = Date.now() - lastConnectedRef.current;
        if (timeSinceLastConnect >= 2000) {
          setBackendReady(prev => {
            if (prev) return false;
            return prev;
          });
        }
      }
    };

    window.addEventListener('backend-status', handleBackendStatus);

    const handleOnline = () => {
      void checkBackend();
    };

    const handleOffline = () => {
      setBackendReady(false);
    };

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void checkBackend();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('backend-status', handleBackendStatus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, []);

  useEffect(() => {
    const handleLocationChange = () => {
      const oppMatch = window.location.pathname.match(/^\/opportunity\/([^/]+)/);
      if (oppMatch) {
         setSelectedOppId(oppMatch[1]);
      } else {
         setSelectedOppId(null);
      }
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken(true);
          const response = await fetch("/api/v1/auth/sync", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            if (data.profile) {
              setProfile(data.profile as UserProfile);
            } else {
              throw new Error("No profile returned from sync endpoint");
            }
          } else {
            throw new Error("Backend sync failed with status " + response.status);
          }
        } catch (error) {
          console.warn("MongoDB auth sync failed, falling back to local Firestore sync:", error);
          try {
            const docRef = doc(db, 'users', currentUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              setProfile(docSnap.data() as UserProfile);
            } else {
              setProfile({
                uid: currentUser.uid,
                name: currentUser.displayName || '',
                email: currentUser.email || '',
                avatarUrl: currentUser.photoURL || ''
              });
            }
          } catch (fsError) {
            console.error("Firestore fallback sync failed:", fsError);
            setProfile({
              uid: currentUser.uid,
              name: currentUser.displayName || '',
              email: currentUser.email || '',
              avatarUrl: currentUser.photoURL || ''
            });
          }
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const viewOpportunity = (id: string, title?: string) => {
    const cleanTitle = title 
      ? title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
      : "view";
    window.history.pushState(null, '', `/opportunity/${id}/${cleanTitle}`);
    setSelectedOppId(id);
  };

  const clearSelectedOpportunity = () => {
    window.history.pushState(null, '', '/');
    setSelectedOppId(null);
  };

  return (
    <AppContext.Provider value={{
      activeTab,
      setActiveTab,
      isMobileMenuOpen,
      setIsMobileMenuOpen,
      user,
      profile,
      setProfile,
      loading,
      backendReady,
      lastSyncedTime,
      appSearchQuery,
      setAppSearchQuery,
      selectedOppId,
      setSelectedOppId,
      viewOpportunity,
      clearSelectedOpportunity,
      theme,
      toggleTheme
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};