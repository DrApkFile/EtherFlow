import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Web3Provider } from "@/context/web3-context"
import { AuthProvider } from "@/context/auth-context"
import { Toaster } from "@/components/ui/toaster"
import Navbar from "@/components/navbar"
import EnvCheck from "./env-check"
import FirebaseStatus from "@/components/firebase-status"
import FirestoreStatus from "@/components/firestore-status"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Web3 Dashboard",
  description: "A Web3 dashboard for managing Ethereum transactions",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <Web3Provider>
              <div className="flex flex-col min-h-screen">
                <Navbar />
                <main className="flex-1">
                  <EnvCheck />
                  <FirebaseStatus />
                  <FirestoreStatus />
                  {children}
                </main>
              </div>
              <Toaster />
            </Web3Provider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}



import './globals.css'