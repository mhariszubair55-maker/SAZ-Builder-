import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  syncUserProfile,
  UserProfileData,
  loginWithGoogle,
  loginWithEmail,
  signupWithEmail,
  logoutUser,
} from '../lib/firebase';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfileData | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'signup';
  isProfileModalOpen: boolean;
  openLoginModal: () => void;
  openSignupModal: () => void;
  closeAuthModal: () => void;
  openProfileModal: () => void;
  closeProfileModal: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const profile = await syncUserProfile(user);
          setUserProfile(profile);
        } catch (err) {
          console.warn('[Auth] Error syncing user profile:', err);
        }
      } else {
        setUserProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const openLoginModal = () => {
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  };

  const openSignupModal = () => {
    setAuthModalMode('signup');
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const openProfileModal = () => {
    setIsProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
  };

  const signInWithGoogle = async () => {
    await loginWithGoogle();
    setIsAuthModalOpen(false);
  };

  const signInWithEmail = async (email: string, pass: string) => {
    await loginWithEmail(email, pass);
    setIsAuthModalOpen(false);
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string) => {
    await signupWithEmail(email, pass, name);
    setIsAuthModalOpen(false);
  };

  const logout = async () => {
    await logoutUser();
    setIsProfileModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        isLoading,
        isAuthModalOpen,
        authModalMode,
        isProfileModalOpen,
        openLoginModal,
        openSignupModal,
        closeAuthModal,
        openProfileModal,
        closeProfileModal,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
