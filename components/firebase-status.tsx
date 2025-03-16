"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { auth } from "@/lib/firebase"

export default function FirebaseStatus() {
  const [status, setStatus] = useState<{
    initialized: boolean
    authEnabled: boolean
    error: string | null
  }>({
    initialized: false,
    authEnabled: false,
    error: null,
  })

  useEffect(() => {
    const checkFirebaseStatus = async () => {
      try {
        // Check if Firebase is initialized
        const isInitialized = !!auth

        // Check if Auth is properly configured by attempting a simple operation
        let authEnabled = false
        let error = null

        if (isInitialized) {
          try {
            // Just check if we can access auth methods
            const methods = await auth?.fetchSignInMethodsForEmail("test@example.com")
            authEnabled = true
          } catch (err: any) {
            if (err.code === "auth/configuration-not-found") {
              error = "Firebase Authentication is not enabled in the Firebase Console"
            } else if (err.code === "auth/invalid-api-key") {
              error = "Invalid Firebase API key"
            } else {
              error = err.message
            }
          }
        }

        setStatus({
          initialized: isInitialized,
          authEnabled,
          error,
        })
      } catch (err: any) {
        setStatus({
          initialized: false,
          authEnabled: false,
          error: err.message,
        })
      }
    }

    checkFirebaseStatus()
  }, [])

  if (!status.initialized) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Firebase Not Initialized</AlertTitle>
        <AlertDescription>
          Firebase is not properly initialized. Please check your environment variables.
        </AlertDescription>
      </Alert>
    )
  }

  if (status.error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Firebase Configuration Error</AlertTitle>
        <AlertDescription>
          {status.error}
          {status.error.includes("Authentication is not enabled") && (
            <div className="mt-2">
              <p>To fix this:</p>
              <ol className="list-decimal pl-5 mt-1">
                <li>Go to the Firebase Console</li>
                <li>Select your project</li>
                <li>Click on "Authentication" in the left sidebar</li>
                <li>Click "Get started" and enable at least one sign-in method</li>
              </ol>
            </div>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  if (!status.authEnabled) {
    return (
      <Alert variant="warning" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Authentication Not Verified</AlertTitle>
        <AlertDescription>Could not verify if Firebase Authentication is properly configured.</AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert variant="default" className="m-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
      <AlertTitle className="text-green-600 dark:text-green-400">Firebase Ready</AlertTitle>
      <AlertDescription className="text-green-600/90 dark:text-green-400/90">
        Firebase is properly initialized and Authentication is enabled.
      </AlertDescription>
    </Alert>
  )
}

