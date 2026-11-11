import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  UserProfile,
  fetchUserProfile,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signInAsGuest,
  logOut,
  testFirestoreConnection,
} from '../services/firebase';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isGuest: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, name: string, role: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  loginGuest: (role?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Test connection on boot
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  const loadProfile = async (firebaseUser: User | null) => {
    if (!firebaseUser) {
      setUserProfile(null);
      return;
    }
    const profile = await fetchUserProfile(firebaseUser.uid);
    if (profile) {
      setUserProfile(profile);
    } else {
      // Fallback profile if Firestore read is pending
      setUserProfile({
        uid: firebaseUser.uid,
        email: firebaseUser.email || 'user@atelier.ai',
        displayName: firebaseUser.displayName || 'Architect',
        role: firebaseUser.isAnonymous ? 'Studio Guest' : 'Interior Designer',
        createdAt: new Date().toISOString(),
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadProfile(currentUser);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const res = await signInWithEmail(email, pass);
      await loadProfile(res);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, pass: string, name: string, role: string) => {
    setLoading(true);
    try {
      const profile = await signUpWithEmail(email, pass, name, role);
      setUserProfile(profile);
    } finally {
      setLoading(false);
    }
  };

  const loginGoogle = async () => {
    setLoading(true);
    try {
      const res = await signInWithGoogle();
      await loadProfile(res);
    } finally {
      setLoading(false);
    }
  };

  const loginGuest = async (role: string = 'Studio Explorer') => {
    setLoading(true);
    try {
      const res = await signInAsGuest(role);
      await loadProfile(res);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await logOut();
      setUser(null);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        isGuest: !!user?.isAnonymous,
        login,
        signup,
        loginGoogle,
        loginGuest,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
