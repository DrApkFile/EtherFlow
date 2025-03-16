"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Database } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, limit } from "firebase/firestore"
import { Button } from "@/components/ui/button"

export default function FirestoreStatus() {
  const [status, setStatus] = useState<{
    initialized: boolean
    available: boolean
    error: string | null
  }>({
    initialized: false,
    available: false,
    error: null,
  })

  const checkFirestoreStatus = async () => {
    try {
      // Check if Firestore is initialized
      const isInitialized = !!db

      // Check if Firestore is available by attempting a simple operation
      let available = false
      let error = null

      if (isInitialized) {
        try {
          // Try to access the users collection
          const usersQuery = query(collection(db, "users"), limit(1))
          await getDocs(usersQuery)
          available = true
        } catch (err: any) {
          if (err.code === "unavailable" || err.message.includes("offline")) {
            error =
              "Firestore is unavailable. Make sure you've created a Firestore database in the Firebase Console and check your internet connection."
          } else if (err.code === "permission-denied") {
            error = "Firestore permission denied. Check your security rules in the Firebase Console."
          } else if (err.code === "not-found") {
            error = "The 'users' collection does not exist yet. This is normal if no users have signed up."
            available = true // We consider this a success case
          } else {
            error = err.message
          }
        }
      }

      setStatus({
        initialized: isInitialized,
        available,
        error,
      })
    } catch (err: any) {
      setStatus({
        initialized: false,
        available: false,
        error: err.message,
      })
    }
  }

  useEffect(() => {
    checkFirestoreStatus()
  }, [])

  if (!status.initialized) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Firestore Not Initialized</AlertTitle>
        <AlertDescription>
          Firestore is not properly initialized. Please check your environment variables.
        </AlertDescription>
      </Alert>
    )
  }

  if (status.error && !status.available) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Firestore Error</AlertTitle>
        <AlertDescription>
          {status.error}
          {status.error.includes("created a Firestore database") && (
            <div className="mt-2">
              <p>To fix this:</p>
              <ol className="list-decimal pl-5 mt-1">
                <li>Go to the Firebase Console</li>
                <li>Select your project</li>
                <li>Click on "Firestore Database" in the left sidebar</li>
                <li>Click "Create database" and follow the setup wizard</li>
                <li>Start in test mode for development</li>
              </ol>
              <Button variant="outline" size="sm" className="mt-2" onClick={checkFirestoreStatus}>
                <Database className="mr-2 h-4 w-4" />
                Check Again
              </Button>
            </div>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  if (status.error && status.available) {
    return (
      <Alert variant="warning" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Firestore Warning</AlertTitle>
        <AlertDescription>{status.error}</AlertDescription>
      </Alert>
    )
  }

  if (!status.available) {
    return (
      <Alert variant="warning" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Firestore Status Unknown</AlertTitle>
        <AlertDescription>
          Could not verify if Firestore is properly configured.
          <Button variant="outline" size="sm" className="mt-2" onClick={checkFirestoreStatus}>
            <Database className="mr-2 h-4 w-4" />
            Check Again
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert variant="default" className="m-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
      <AlertTitle className="text-green-600 dark:text-green-400">Firestore Ready</AlertTitle>
      <AlertDescription className="text-green-600/90 dark:text-green-400/90">
        Firestore is properly initialized and available.
      </AlertDescription>
    </Alert>
  )
}

