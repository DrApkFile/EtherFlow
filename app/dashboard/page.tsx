"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Wallet, ArrowUpRight, History, RefreshCw, User, ArrowDownUp } from "lucide-react"
import TransactionHistory from "@/components/transaction-history"
import WalletConnect from "@/components/wallet-connect"
import { useWeb3 } from "@/context/web3-context"
import { useAuth } from "@/context/auth-context"
import Link from "next/link"
import GasTracker from "@/components/gas-tracker"
import TokenSwap from "@/components/token-swap"

export default function Dashboard() {
  const { toast } = useToast()
  const router = useRouter()
  const { account, balance, connectWallet, sendTransaction, isConnected, refreshBalance } = useWeb3()
  const { user, loading, linkWalletToUser } = useAuth()

  const [recipient, setRecipient] = useState("")
  const [amount, setAmount] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [walletLinked, setWalletLinked] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const linkWalletIfConnected = async () => {
      if (isConnected && user && !walletLinked) {
        try {
          await linkWalletToUser(account)
          setWalletLinked(true)
          toast({
            title: "Wallet linked",
            description: "Your wallet has been linked to your account",
          })
        } catch (error) {
          console.error("Error linking wallet:", error)
        }
      }
    }

    linkWalletIfConnected()
  }, [isConnected, user, account, linkWalletToUser, walletLinked, toast])

  const handleSendTransaction = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!recipient || !amount) {
      toast({
        title: "Error",
        description: "Please enter recipient address and amount",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      console.log("Sending transaction to", recipient, "with amount", amount)
      await sendTransaction(recipient, amount)
      setRecipient("")
      setAmount("")
      toast({
        title: "Success",
        description: "Transaction sent successfully",
      })
    } catch (error: any) {
      console.error("Transaction error in dashboard:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to send transaction",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Router will redirect to login
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
            <CardDescription>Connect your wallet to access the dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <WalletConnect />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Web3 Dashboard</h1>
          <p className="text-muted-foreground">Welcome, {user.displayName || user.email}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0">
          <Button variant="outline" onClick={refreshBalance}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Link href="/profile">
            <Button variant="outline">
              <User className="mr-2 h-4 w-4" />
              Profile
            </Button>
          </Link>
        </div>
      </div>

      {/* Gas Tracker */}
      <div className="mb-8">
        <GasTracker />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallet Address</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium truncate" title={account}>
              {account}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ETH Balance</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 320 512"
              className="h-4 w-4 text-muted-foreground"
              fill="currentColor"
            >
              <path d="M311.9 260.8L160 353.6 8 260.8 160 0l151.9 260.8zM160 383.4L8 290.6 160 512l152-221.4-152 92.8z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{balance} ETH</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">{user.email}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="send" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="send">
            <ArrowUpRight className="mr-2 h-4 w-4" />
            Send ETH
          </TabsTrigger>
          <TabsTrigger value="swap">
            <ArrowDownUp className="mr-2 h-4 w-4" />
            Swap Tokens
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-2 h-4 w-4" />
            Transaction History
          </TabsTrigger>
        </TabsList>
        <TabsContent value="send">
          <Card>
            <CardHeader>
              <CardTitle>Send ETH</CardTitle>
              <CardDescription>Send ETH to another wallet address</CardDescription>
            </CardHeader>
            <form onSubmit={handleSendTransaction}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recipient">Recipient Address</Label>
                  <Input
                    id="recipient"
                    placeholder="0x..."
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (ETH)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.0001"
                    min="0"
                    placeholder="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? "Sending..." : "Send Transaction"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        <TabsContent value="swap">
          <TokenSwap />
        </TabsContent>
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>View your recent transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionHistory address={account} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

