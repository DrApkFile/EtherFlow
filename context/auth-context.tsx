"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import {
  type User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth"
import { doc, setDoc, getDoc, updateDoc, collection } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface UserData {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  walletAddresses?: string[]
}

interface AuthContextType {
  user: UserData | null
  loading: boolean
  signUp: (email: string, password: string, name: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  googleSignIn: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  linkWalletToUser: (walletAddress: string) => Promise<void>
  getUserWallets: () => Promise<string[]>
  firestoreError: string | null
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signUp: async () => {},
  login: async () => {},
  logout: async () => {},
  googleSignIn: async () => {},
  resetPassword: async () => {},
  linkWalletToUser: async () => {},
  getUserWallets: async () => [],
  firestoreError: null,
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [firestoreError, setFirestoreError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  // Handle Firebase Auth errors with user-friendly messages
  const handleAuthError = (error: any) => {
    console.error("Firebase Auth Error:", error)

    if (error.code === "auth/configuration-not-found") {
      toast({
        title: "Authentication Error",
        description:
          "Firebase Authentication is not properly configured. Please make sure you've enabled Authentication in the Firebase Console.",
        variant: "destructive",
      })
      return "Firebase Authentication is not properly configured. Please contact support."
    }

    if (error.code === "auth/invalid-api-key") {
      toast({
        title: "Configuration Error",
        description: "Invalid Firebase API key. Please check your environment variables.",
        variant: "destructive",
      })
      return "Invalid Firebase configuration. Please contact support."
    }

    // Handle other common errors
    const errorMessages: Record<string, string> = {
      "auth/email-already-in-use": "This email is already in use. Try logging in instead.",
      "auth/invalid-email": "Please enter a valid email address.",
      "auth/user-disabled": "This account has been disabled. Please contact support.",
      "auth/user-not-found": "No account found with this email. Please sign up.",
      "auth/wrong-password": "Incorrect password. Please try again.",
      "auth/weak-password": "Password should be at least 6 characters.",
      "auth/popup-closed-by-user": "Sign-in popup was closed before completing the sign-in.",
      "auth/cancelled-popup-request": "The sign-in popup was cancelled.",
      "auth/popup-blocked": "The sign-in popup was blocked by your browser.",
      "auth/network-request-failed": "Network error. Please check your internet connection.",
    }

    return errorMessages[error.code] || error.message || "An unexpected authentication error occurred."
  }

  // Handle Firestore errors
  const handleFirestoreError = (error: any) => {
    console.error("Firestore Error:", error)

    let errorMessage = "An unexpected database error occurred."

    if (error.code === "unavailable" || error.message.includes("offline")) {
      errorMessage = "Database is unavailable. Please check your internet connection."
      setFirestoreError(
        "Firestore is unavailable. Make sure you've created a Firestore database in the Firebase Console and check your internet connection.",
      )
    } else if (error.code === "permission-denied") {
      errorMessage = "You don't have permission to access this data."
      setFirestoreError("Firestore permission denied. Check your security rules in the Firebase Console.")
    } else if (error.code === "not-found") {
      errorMessage = "The requested data does not exist."
    }

    toast({
      title: "Database Error",
      description: errorMessage,
      variant: "destructive",
    })

    return errorMessage
  }

  // Check if Firebase is initialized
  const isFirebaseInitialized = () => {
    if (!auth) {
      toast({
        title: "Firebase Error",
        description: "Firebase Authentication is not properly initialized. Check your environment variables.",
        variant: "destructive",
      })
      return false
    }
    return true
  }

  // Check if Firestore is initialized
  const isFirestoreInitialized = () => {
    if (!db) {
      toast({
        title: "Firestore Error",
        description: "Firestore database is not properly initialized. Check your environment variables.",
        variant: "destructive",
      })
      setFirestoreError("Firestore is not initialized. Check your environment variables.")
      return false
    }
    return true
  }

  // Create user profile in Firestore
  const createUserProfile = async (user: User) => {
    if (!isFirestoreInitialized()) return null

    try {
      // First check if the users collection exists
      try {
        const usersCollectionRef = collection(db, "users")
        // This is just to check if the collection exists and is accessible
      } catch (error) {
        console.error("Error accessing users collection:", error)
        handleFirestoreError(error)
        return null
      }

      const userRef = doc(db, "users", user.uid)
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        walletAddresses: [],
        createdAt: new Date().toISOString(),
      }

      await setDoc(userRef, userData)
      return userData
    } catch (error) {
      console.error("Error creating user profile:", error)
      handleFirestoreError(error)
      return null
    }
  }

  // Get user profile from Firestore
  const getUserProfile = async (uid: string) => {
    if (!isFirestoreInitialized()) return null

    try {
      const userRef = doc(db, "users", uid)
      const userSnap = await getDoc(userRef)

      if (userSnap.exists()) {
        return userSnap.data() as UserData
      }

      return null
    } catch (error) {
      console.error("Error getting user profile:", error)
      handleFirestoreError(error)
      return null
    }
  }

  // Sign up with email and password
  const signUp = async (email: string, password: string, name: string) => {
    if (!isFirebaseInitialized()) {
      throw new Error("Firebase authentication is not initialized")
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Update profile with display name
      await updateProfile(user, {
        displayName: name,
      })

      // Create a minimal user object in case Firestore fails
      const minimalUser: UserData = {
        uid: user.uid,
        email: user.email,
        displayName: name,
        photoURL: null,
      }

      // Set the user immediately so the app is usable even if Firestore fails
      setUser(minimalUser)

      try {
        // Try to create user profile in Firestore
        await createUserProfile(user)
      } catch (error) {
        console.error("Error creating Firestore profile, continuing with minimal user:", error)
        handleFirestoreError(error)
        // We continue even if Firestore fails
      }

      router.push("/dashboard")
    } catch (error: any) {
      const errorMessage = handleAuthError(error)
      throw new Error(errorMessage)
    }
  }

  // Login with email and password
  const login = async (email: string, password: string) => {
    if (!isFirebaseInitialized()) {
      throw new Error("Firebase authentication is not initialized")
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)

      // Create a minimal user object in case Firestore fails
      const user = userCredential.user
      const minimalUser: UserData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      }

      // Set the user immediately so the app is usable even if Firestore fails
      setUser(minimalUser)

      router.push("/dashboard")
    } catch (error: any) {
      const errorMessage = handleAuthError(error)
      throw new Error(errorMessage)
    }
  }

  // Sign in with Google
  const googleSignIn = async () => {
    if (!isFirebaseInitialized()) {
      throw new Error("Firebase authentication is not initialized")
    }

    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      // Create a minimal user object in case Firestore fails
      const minimalUser: UserData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      }

      // Set the user immediately so the app is usable even if Firestore fails
      setUser(minimalUser)

      try {
        // Try to get or create user profile in Firestore
        const userProfile = await getUserProfile(user.uid)
        if (!userProfile) {
          await createUserProfile(user)
        }
      } catch (error) {
        console.error("Error with Firestore profile, continuing with minimal user:", error)
        handleFirestoreError(error)
        // We continue even if Firestore fails
      }

      router.push("/dashboard")
    } catch (error: any) {
      const errorMessage = handleAuthError(error)
      throw new Error(errorMessage)
    }
  }

  // Logout
  const logout = async () => {
    if (!isFirebaseInitialized()) {
      throw new Error("Firebase authentication is not initialized")
    }

    try {
      await signOut(auth)
      router.push("/login")
    } catch (error: any) {
      const errorMessage = handleAuthError(error)
      throw new Error(errorMessage)
    }
  }

  // Reset password
  const resetPassword = async (email: string) => {
    if (!isFirebaseInitialized()) {
      throw new Error("Firebase authentication is not initialized")
    }

    try {
      await sendPasswordResetEmail(auth, email)
    } catch (error: any) {
      const errorMessage = handleAuthError(error)
      throw new Error(errorMessage)
    }
  }

  // Link wallet address to user
  const linkWalletToUser = async (walletAddress: string) => {
    if (!isFirestoreInitialized()) {
      throw new Error("Firestore is not initialized")
    }

    if (!user) throw new Error("No user logged in")

    try {
      const userRef = doc(db, "users", user.uid)

      try {
        const userSnap = await getDoc(userRef)

        if (userSnap.exists()) {
          const userData = userSnap.data() as UserData
          const walletAddresses = userData.walletAddresses || []

          // Check if wallet is already linked
          if (!walletAddresses.includes(walletAddress)) {
            await updateDoc(userRef, {
              walletAddresses: [...walletAddresses, walletAddress],
            })

            // Update local user state
            setUser({
              ...user,
              walletAddresses: [...walletAddresses, walletAddress],
            })
          }
        } else {
          // If user document doesn't exist in Firestore, create it
          const userData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            walletAddresses: [walletAddress],
            createdAt: new Date().toISOString(),
          }

          await setDoc(userRef, userData)

          // Update local user state
          setUser({
            ...user,
            walletAddresses: [walletAddress],
          })
        }
      } catch (error) {
        // If we can't access Firestore, just update the local state
        console.error("Error accessing Firestore, updating local state only:", error)
        handleFirestoreError(error)

        // Update local user state
        const walletAddresses = user.walletAddresses || []
        if (!walletAddresses.includes(walletAddress)) {
          setUser({
            ...user,
            walletAddresses: [...walletAddresses, walletAddress],
          })
        }
      }
    } catch (error: any) {
      handleFirestoreError(error)
      throw new Error("Failed to link wallet: " + error.message)
    }
  }

  // Get user's linked wallets
  const getUserWallets = async (): Promise<string[]> => {
    if (!user) return []

    // If we have wallets in the local state, return those
    if (user.walletAddresses && user.walletAddresses.length > 0) {
      return user.walletAddresses
    }

    // Otherwise try to get from Firestore
    if (!isFirestoreInitialized()) return []

    try {
      const userRef = doc(db, "users", user.uid)
      const userSnap = await getDoc(userRef)

      if (userSnap.exists()) {
        const userData = userSnap.data() as UserData
        const wallets = userData.walletAddresses || []

        // Update local state
        if (wallets.length > 0 && !user.walletAddresses) {
          setUser({
            ...user,
            walletAddresses: wallets,
          })
        }

        return wallets
      }

      return []
    } catch (error) {
      console.error("Error getting user wallets:", error)
      handleFirestoreError(error)
      return user.walletAddresses || []
    }
  }

  // Listen for auth state changes
  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return () => {}
    }

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      try {
        if (authUser) {
          // User is signed in
          // Create a minimal user object first
          const minimalUser: UserData = {
            uid: authUser.uid,
            email: authUser.email,
            displayName: authUser.displayName,
            photoURL: authUser.photoURL,
          }

          // Set the minimal user immediately
          setUser(minimalUser)

          try {
            // Try to get the full profile from Firestore
            const userProfile = await getUserProfile(authUser.uid)

            if (userProfile) {
              setUser(userProfile)
            } else {
              // Create profile if it doesn't exist
              try {
                const newProfile = await createUserProfile(authUser)
                if (newProfile) {
                  setUser(newProfile)
                }
              } catch (error) {
                console.error("Error creating user profile:", error)
                handleFirestoreError(error)
                // Continue with minimal user
              }
            }
          } catch (error) {
            console.error("Error getting user profile:", error)
            handleFirestoreError(error)
            // Continue with minimal user
          }
        } else {
          // User is signed out
          setUser(null)
          setFirestoreError(null)
        }
      } catch (error) {
        console.error("Auth state change error:", error)
        handleAuthError(error)
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const value = {
    user,
    loading,
    signUp,
    login,
    logout,
    googleSignIn,
    resetPassword,
    linkWalletToUser,
    getUserWallets,
    firestoreError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

