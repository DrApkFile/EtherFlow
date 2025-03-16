"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { useWeb3 } from "@/context/web3-context"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, User, Wallet, LinkIcon, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

export default function ProfilePage() {
  const { user, loading, linkWalletToUser, getUserWallets } = useAuth()
  const { account, connectWallet, isConnected } = useWeb3()
  const [linkedWallets, setLinkedWallets] = useState<string[]>([])
  const [isLinking, setIsLinking] = useState(false)
  const [error, setError] = useState("")
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchWallets = async () => {
      if (user) {
        const wallets = await getUserWallets()
        setLinkedWallets(wallets)
      }
    }

    fetchWallets()
  }, [user, getUserWallets])

  const handleLinkWallet = async () => {
    setError("")

    if (!isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLinking(true)
      await linkWalletToUser(account)

      // Refresh linked wallets
      const wallets = await getUserWallets()
      setLinkedWallets(wallets)

      toast({
        title: "Wallet linked successfully",
        description: "Your wallet has been linked to your account",
      })
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLinking(false)
    }
  }

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return null // Router will redirect to login
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Manage your account and wallet connections</p>
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr_2fr]">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24">
                {user.photoURL ? (
                  <AvatarImage src={user.photoURL} alt={user.displayName || ""} />
                ) : (
                  <AvatarFallback>
                    <User className="h-12 w-12" />
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="space-y-1 text-center">
                <h2 className="text-xl font-semibold">{user.displayName || "User"}</h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="wallets" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="wallets">
              <Wallet className="mr-2 h-4 w-4" />
              Linked Wallets
            </TabsTrigger>
            <TabsTrigger value="settings">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2 h-4 w-4"
              >
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Account Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wallets">
            <Card>
              <CardHeader>
                <CardTitle>Linked Wallets</CardTitle>
                <CardDescription>Connect and manage your Ethereum wallets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label>Current Wallet</Label>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Wallet className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {isConnected ? (
                            <>
                              {account.substring(0, 6)}...{account.substring(account.length - 4)}
                            </>
                          ) : (
                            "No wallet connected"
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{isConnected ? "Connected" : "Not connected"}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={isConnected ? handleLinkWallet : connectWallet}
                      disabled={isLinking || (isConnected && linkedWallets.includes(account))}
                    >
                      {isLinking ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Linking...
                        </>
                      ) : isConnected ? (
                        linkedWallets.includes(account) ? (
                          "Already Linked"
                        ) : (
                          <>
                            <LinkIcon className="mr-2 h-4 w-4" />
                            Link Wallet
                          </>
                        )
                      ) : (
                        "Connect Wallet"
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Linked Wallets</Label>
                  {linkedWallets.length > 0 ? (
                    <div className="space-y-2">
                      {linkedWallets.map((wallet) => (
                        <div key={wallet} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                              <Wallet className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {wallet.substring(0, 6)}...{wallet.substring(wallet.length - 4)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {wallet === account ? (
                                  <Badge variant="outline" className="text-xs">
                                    Current
                                  </Badge>
                                ) : (
                                  "Ethereum"
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border p-4 text-center">
                      <p className="text-sm text-muted-foreground">No wallets linked to your account yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your account preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="display-name">Display Name</Label>
                  <Input id="display-name" defaultValue={user.displayName || ""} placeholder="Your name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue={user.email || ""} disabled />
                  <p className="text-xs text-muted-foreground">
                    Your email address is used for login and cannot be changed
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button>Save Changes</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

