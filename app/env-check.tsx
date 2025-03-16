"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function EnvCheck() {
  const [missingVars, setMissingVars] = useState<string[]>([])

  useEffect(() => {
    const requiredVars = [
      "NEXT_PUBLIC_FIREBASE_API_KEY",
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
      "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
      "NEXT_PUBLIC_FIREBASE_APP_ID",
      "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID",
    ]

    const missing = requiredVars.filter((varName) => {
      const value = process.env[varName as keyof typeof process.env]
      return !value || value.length === 0
    })

    setMissingVars(missing)
  }, [])

  if (missingVars.length === 0) return null

  return (
    <Alert variant="destructive" className="m-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Missing Environment Variables</AlertTitle>
      <AlertDescription>
        <p>The following environment variables are missing or empty:</p>
        <ul className="list-disc pl-5 mt-2">
          {missingVars.map((varName) => (
            <li key={varName}>{varName}</li>
          ))}
        </ul>
        <p className="mt-2">Please add these to your .env.local file or deployment environment.</p>
      </AlertDescription>
    </Alert>
  )
}

