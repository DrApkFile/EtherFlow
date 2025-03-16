import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore"

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Check if all required environment variables are defined
const isConfigValid = () => {
  const requiredVars = [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  ]

  return requiredVars.every((varName) => process.env[varName] && process.env[varName]!.length > 0)
}

// Initialize Firebase
let firebaseApp
let firebaseAuth
let firebaseDb

if (typeof window !== "undefined" && isConfigValid()) {
  try {
    // Initialize Firebase only once
    firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
    firebaseAuth = getAuth(firebaseApp)
    firebaseDb = getFirestore(firebaseApp)

    // Enable offline persistence for Firestore
    // This allows the app to work offline and sync when back online
    if (firebaseDb) {
      enableIndexedDbPersistence(firebaseDb).catch((err) => {
        if (err.code === "failed-precondition") {
          // Multiple tabs open, persistence can only be enabled in one tab at a time
          console.warn("Firestore persistence failed: Multiple tabs open")
        } else if (err.code === "unimplemented") {
          // The current browser doesn't support all of the features required for persistence
          console.warn("Firestore persistence not supported in this browser")
        } else {
          console.error("Firestore persistence error:", err)
        }
      })
    }
  } catch (error) {
    console.error("Firebase initialization error:", error)
  }
}

export const app = firebaseApp
export const auth = firebaseAuth
export const db = firebaseDb

// Helper function to check if Firestore is available
export const isFirestoreAvailable = async () => {
  if (!db) return false

  try {
    // Try a simple operation to check connectivity
    const testDoc = db.collection("_test_").doc("_test_")
    await testDoc.get()
    return true
  } catch (error) {
    return false
  }
}

