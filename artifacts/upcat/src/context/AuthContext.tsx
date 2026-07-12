import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = onAuthStateChanged(
        auth,
        (firebaseUser) => {
          setUser(firebaseUser);
          setLoading(false);
        },
        (error) => {
          console.error("Auth state change error:", error);
          setLoading(false);
        }
      );
    } catch (err) {
      console.error("Failed to register onAuthStateChanged listener:", err);
      setLoading(false);
    }
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Sign-in error:", error);
      let title = "Sign-in Failed";
      let desc = error?.message || "Could not sign in with Google. Please try again.";
      
      if (error?.message?.includes("auth/api-key-not-valid") || error?.message?.includes("API key")) {
        desc = "Firebase is not configured yet with valid credentials. You can still use KolehiyoTrack in local mode!";
      } else if (error?.message?.includes("auth/unauthorized-domain") || error?.code === "auth/unauthorized-domain") {
        title = "Authorized Domain Required";
        desc = `Please add "${window.location.hostname}" to your Firebase Console under Authentication > Settings > Authorized Domains.`;
      }
      
      toast({
        title,
        description: desc,
        variant: "destructive",
      });
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
      
      // Clear localStorage of any uploaded question banks and used history so they don't overlap
      const keysToClear: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith("iskolartrack_bank_") || 
          key.startsWith("iskolartrack_used_") ||
          key.startsWith("kolehiyotrack_bank_") ||
          key.startsWith("kolehiyotrack_used_")
        )) {
          keysToClear.push(key);
        }
      }
      keysToClear.forEach((key) => localStorage.removeItem(key));
      
      // Redirect to the base URL of the app to reset state and prevent 404 errors on nested pages under static hosting
      window.location.href = import.meta.env.BASE_URL || "/";
    } catch (error: any) {
      console.error("Sign-out error:", error);
      toast({
        title: "Sign-out Failed",
        description: error?.message || "Could not sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

