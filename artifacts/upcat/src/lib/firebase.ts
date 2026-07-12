import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// Helper to check if a Firebase API key is valid
const isValidFirebaseKey = (key: any): boolean => {
  if (typeof key !== "string") return false;
  const trimmed = key.trim();
  return (
    trimmed.startsWith("AIzaSy") &&
    !trimmed.includes("YOUR_") &&
    !trimmed.includes("Dummy") &&
    !trimmed.includes("PlaceHolder") &&
    trimmed.length > 20
  );
};

const userConfig = {
  apiKey: "AIzaSyAHkd2lLxIVtOXpallPZkXUq6FXXLYu5Zc",
  authDomain: "jupcatrev.firebaseapp.com",
  projectId: "jupcatrev",
  storageBucket: "jupcatrev.firebasestorage.app",
  messagingSenderId: "786004962912",
  appId: "1:786004962912:web:1edf68af17f9c52ee61d05",
};

// We prioritize the user's hardcoded config because it was explicitly provided.
// If it's not valid, we check the environment variables.
const firebaseConfig = isValidFirebaseKey(userConfig.apiKey)
  ? userConfig
  : {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dummy-app.firebaseapp.com",
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dummy-project-id",
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dummy-app.appspot.com",
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
      appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456",
    };

console.log("Initializing Firebase with project:", firebaseConfig.projectId);

const isFirebaseConfigured = isValidFirebaseKey(firebaseConfig.apiKey);

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.warn("Failed to initialize Firebase with current config, using local-only fallback:", error);
  // Fallback structural objects if initialization fails completely
  app = {} as FirebaseApp;
  auth = {} as Auth;
  db = {} as Firestore;
}

export { app, auth, db, isFirebaseConfigured };
export const googleProvider = new GoogleAuthProvider();


