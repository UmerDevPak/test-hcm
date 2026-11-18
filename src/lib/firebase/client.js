import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import appletConfig from "../../../firebase-applet-config.json";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || appletConfig.apiKey || "demo-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain || "demo-hcm-lite.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || appletConfig.projectId || "demo-hcm-lite",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket || "demo-hcm-lite.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId || "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || appletConfig.appId || "1:123456789:web:abcdef123456",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || appletConfig.measurementId || "G-DEMO123",
  firestoreDatabaseId: appletConfig.firestoreDatabaseId || undefined,
};

// Check if actual production credentials are provided (via env vars or firebase-applet-config.json)
export const isLiveFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.apiKey !== "your_firebase_api_key_here" &&
    firebaseConfig.apiKey !== "demo-api-key" &&
    firebaseConfig.projectId !== "remixed-project-id"
);

// Determine if app is operating in mock / demo mode
export const isDemoMode = process.env.NEXT_PUBLIC_USE_DEMO_DATA === "true" || !isLiveFirebaseConfigured;

let app;
let auth;
let db;
let storage;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = firebaseConfig.firestoreDatabaseId
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
  storage = getStorage(app);
} catch (error) {
  console.warn("[Firebase] Client initialization notice (fallback mode active):", error.message);
}

// Validate live connection to Firestore on browser startup
if (typeof window !== "undefined" && !isDemoMode && db) {
  getDocFromServer(doc(db, "test", "connection")).catch((error) => {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.");
    }
  });
}

export { app, auth, db, storage };
