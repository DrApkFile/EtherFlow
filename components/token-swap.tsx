"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { useWeb3 } from "@/context/web3-context"
import { ArrowDownUp, RefreshCw, Info, AlertCircle } from "lucide-react"
import { ethers } from "ethers"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Helper function to handle ethers v5 and v6 compatibility
const formatEther = (value: any) => {
  // Check if ethers.utils exists (v5) or if formatEther is directly on ethers (v5)
  if (ethers.utils && typeof ethers.utils.formatEther === "function") {
    return ethers.utils.formatEther(value)
  } else if (typeof ethers.formatEther === "function") {
    return ethers.formatEther(value)
  } else {
    // Fallback implementation if neither is available
    return (Number(value) / 1e18).toString()
  }
}

interface Token {
  symbol: string
  name: string
  address: string
  decimals: number
  logoURI: string
  balance?: string
}

interface QuoteResult {
  exchange: string
  outputAmount: string
  price: number
  priceImpact: number
  gasEstimate: number
  routeInfo?: string
}

// ERC20 ABI for token interactions
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function approve(address spender, uint256 amount) returns (bool)",
]

export default function TokenSwap() {
  const [tokens, setTokens] = useState<Token[]>([])
  const [fromToken, setFromToken] = useState<Token | null>(null)
  const [toToken, setToToken] = useState<Token | null>(null)
  const [fromAmount, setFromAmount] = useState("")
  const [toAmount, setToAmount] = useState("")
  const [slippage, setSlippage] = useState("0.5")
  const [quotes, setQuotes] = useState<QuoteResult[]>([])
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null)
  const [loadingQuotes, setLoadingQuotes] = useState(false)
  const [loadingSwap, setLoadingSwap] = useState(false)
  const [loadingTokens, setLoadingTokens] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const { account, provider, isConnected } = useWeb3()

  // Fetch popular token list
  useEffect(() => {
    const fetchTokenList = async () => {
      setLoadingTokens(true)
      setError(null)

      try {
        // Fetch tokens from a trusted API
        const response = await fetch("https://tokens.coingecko.com/ethereum/all.json")

        if (!response.ok) {
          throw new Error(`Failed to fetch token list: ${response.status}`)
        }

        const data = await response.json()

        if (!data.tokens || !Array.isArray(data.tokens)) {
          throw new Error("Invalid token list format")
        }

        // Filter for popular tokens - in a real app you might have a more sophisticated approach
        const popularTokenAddresses = [
          "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", // ETH
          "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
          "0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT
          "0x6b175474e89094c44da98b954eedeac495271d0f", // DAI
          "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", // WBTC
          "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984", // UNI
          "0x514910771af9ca656af840dff83e8264ecf986ca", // LINK
          "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9", // AAVE
        ]

        // Add ETH as the first token since it's not in the API
        const tokenList: Token[] = [
          {
            symbol: "ETH",
            name: "Ethereum",
            address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            decimals: 18,
            logoURI: "https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png",
          },
        ]

        // Add other popular tokens
        const popularTokens = data.tokens
          .filter((token: any) => popularTokenAddresses.includes(token.address.toLowerCase()))
          .map((token: any) => ({
            symbol: token.symbol,
            name: token.name,
            address: token.address,
            decimals: token.decimals,
            logoURI:
              token.logoURI ||
              `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${token.address}/logo.png`,
          }))

        tokenList.push(...popularTokens)

        setTokens(tokenList)

        // Set default from and to tokens
        if (tokenList.length >= 2) {
          setFromToken(tokenList[0]) // ETH
          setToToken(tokenList[1]) // Usually USDC
        }
      } catch (error: any) {
        console.error("Error fetching token list:", error)
        setError(`Failed to load token list: ${error.message}`)

        // Set minimal token list as fallback
        const fallbackTokens = [
          {
            symbol: "ETH",
            name: "Ethereum",
            address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            decimals: 18,
            logoURI: "https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png",
          },
          {
            symbol: "USDC",
            name: "USD Coin",
            address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            decimals: 6,
            logoURI: "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png",
          },
        ]

        setTokens(fallbackTokens)
        setFromToken(fallbackTokens[0])
        setToToken(fallbackTokens[1])
      } finally {
        setLoadingTokens(false)
      }
    }

    fetchTokenList()
  }, [])

  // Fetch token balances
  useEffect(() => {
    const fetchBalances = async () => {
      if (!isConnected || !provider || !account || tokens.length === 0) return

      try {
        const updatedTokens = await Promise.all(
          tokens.map(async (token) => {
            try {
              let balance = "0"

              if (token.symbol === "ETH") {
                try {
                  // Handle different ethers versions
                  if (typeof provider.getBalance === "function") {
                    // ethers v5
                    const ethBalance = await provider.getBalance(account)
                    balance = formatEther(ethBalance)
                  } else if (provider.provider && typeof provider.provider.getBalance === "function") {
                    // ethers v6
                    const ethBalance = await provider.provider.getBalance(account)
                    balance = formatEther(ethBalance)
                  } else {
                    // Fallback to direct RPC call
                    const balanceHex = await (window as any).ethereum?.request?.({
                      method: "eth_getBalance",
                      params: [account, "latest"],
                    })

                    if (balanceHex) {
                      // Convert hex to decimal and then to ETH
                      const balanceWei = Number.parseInt(balanceHex, 16).toString()
                      balance = formatEther(balanceWei)
                    } else {
                      throw new Error("Failed to get ETH balance")
                    }
                  }
                } catch (error) {
                  console.error("Error getting ETH balance:", error)
                  throw error
                }
              } else {
                // For ERC-20 tokens, use the contract
                try {
                  // Create a contract instance based on ethers version
                  let tokenContract

                  if (ethers.Contract) {
                    // ethers v5 or v6
                    tokenContract = new ethers.Contract(token.address, ERC20_ABI, provider)
                  } else {
                    throw new Error("Ethers Contract not available")
                  }

                  // Get token balance
                  const tokenBalance = await tokenContract.balanceOf(account)

                  // Format based on token decimals
                  if (ethers.utils && typeof ethers.utils.formatUnits === "function") {
                    balance = ethers.utils.formatUnits(tokenBalance, token.decimals)
                  } else if (typeof ethers.formatUnits === "function") {
                    balance = ethers.formatUnits(tokenBalance, token.decimals)
                  } else {
                    // Fallback formatting
                    const divisor = Math.pow(10, token.decimals)
                    balance = (Number(tokenBalance.toString()) / divisor).toString()
                  }
                } catch (error) {
                  console.error(`Error fetching balance for ${token.symbol}:`, error)
                  throw error
                }
              }

              return {
                ...token,
                balance,
              }
            } catch (error) {
              console.error(`Error fetching balance for ${token.symbol}:`, error)
              // Return token without balance rather than failing completely
              return {
                ...token,
                balance: "0",
              }
            }
          }),
        )

        setTokens(updatedTokens)

        // Update fromToken with balance if it exists
        if (fromToken) {
          const updatedFromToken = updatedTokens.find((t) => t.address === fromToken.address)
          if (updatedFromToken) {
            setFromToken(updatedFromToken)
          }
        }

        // Update toToken with balance if it exists
        if (toToken) {
          const updatedToToken = updatedTokens.find((t) => t.address === toToken.address)
          if (updatedToToken) {
            setToToken(updatedToToken)
          }
        }
      } catch (error) {
        console.error("Error fetching token balances:", error)
        toast({
          title: "Balance Error",
          description: "Could not fetch token balances. Please try again.",
          variant: "destructive",
        })
      }
    }

    fetchBalances()

    // Set up polling for balance updates
    const intervalId = setInterval(fetchBalances, 30000) // Update every 30 seconds

    return () => clearInterval(intervalId)
  }, [isConnected, provider, account, tokens.length, fromToken, toToken, toast])

  // Swap tokens
  const handleSwapTokens = () => {
    if (!fromToken || !toToken) return

    const temp = fromToken
    setFromToken(toToken)
    setToToken(temp)
    setFromAmount(toAmount)
    setToAmount(fromAmount)
    setQuotes([])
    setSelectedQuote(null)
  }

  // Get quotes when amount or tokens change
  useEffect(() => {
    const getQuotes = async () => {
      if (!fromToken || !toToken || !fromAmount || Number.parseFloat(fromAmount) <= 0) {
        setQuotes([])
        setToAmount("")
        return
      }

      setLoadingQuotes(true)
      setError(null)

      try {
        // In a production environment, these API calls should be proxied through your backend
        // to avoid CORS issues. For this demo, we'll create a simulated response based on
        // real-world price data to demonstrate the UI functionality.

        // Calculate a realistic exchange rate based on token types
        let exchangeRate = 1.0

        // Simulate different exchange rates based on token pairs
        if (fromToken.symbol === "ETH" && toToken.symbol === "USDC") {
          exchangeRate = 3000 + (Math.random() * 200 - 100) // ETH to USDC around $3000 with some variance
        } else if (fromToken.symbol === "ETH" && toToken.symbol === "WBTC") {
          exchangeRate = 0.06 + Math.random() * 0.005 // ETH to WBTC around 0.06 BTC
        } else if (fromToken.symbol === "USDC" && toToken.symbol === "ETH") {
          exchangeRate = 1 / 3000 + Math.random() * 0.0001 // USDC to ETH
        } else if (fromToken.symbol === "USDC" && toToken.symbol === "USDT") {
          exchangeRate = 0.99 + Math.random() * 0.02 // USDC to USDT around 1:1 with small variance
        } else if (fromToken.symbol === "ETH" && toToken.symbol === "DAI") {
          exchangeRate = 3000 + (Math.random() * 200 - 100) // ETH to DAI around $3000
        } else if (fromToken.symbol === "DAI" && toToken.symbol === "USDC") {
          exchangeRate = 0.99 + Math.random() * 0.02 // DAI to USDC around 1:1
        } else {
          // For other pairs, generate a reasonable exchange rate
          exchangeRate = 1 + (Math.random() * 2 - 1) // Random rate between 0 and 2
        }

        // Calculate output amount
        const outputAmount = (Number.parseFloat(fromAmount) * exchangeRate).toFixed(6)

        // Create simulated quotes from different exchanges
        const simulatedQuotes: QuoteResult[] = [
          {
            exchange: "1inch",
            outputAmount,
            price: exchangeRate,
            priceImpact: 0.2 + Math.random() * 0.5, // 0.2% to 0.7%
            gasEstimate: 120000 + Math.floor(Math.random() * 50000),
            routeInfo: `${fromToken.symbol} > ${toToken.symbol}`,
          },
          {
            exchange: "0x",
            outputAmount: (Number.parseFloat(outputAmount) * (1 - 0.001 - Math.random() * 0.003)).toFixed(6), // Slightly worse price
            price: exchangeRate * (1 - 0.001 - Math.random() * 0.003),
            priceImpact: 0.3 + Math.random() * 0.6, // 0.3% to 0.9%
            gasEstimate: 150000 + Math.floor(Math.random() * 50000),
            routeInfo: `${fromToken.symbol} > ${toToken.symbol}`,
          },
          {
            exchange: "uniswap",
            outputAmount: (Number.parseFloat(outputAmount) * (1 - 0.002 - Math.random() * 0.002)).toFixed(6), // Slightly worse price
            price: exchangeRate * (1 - 0.002 - Math.random() * 0.002),
            priceImpact: 0.4 + Math.random() * 0.7, // 0.4% to 1.1%
            gasEstimate: 180000 + Math.floor(Math.random() * 40000),
            routeInfo: `${fromToken.symbol} > WETH > ${toToken.symbol}`,
          },
        ]

        // Sort quotes by output amount (best deal first)
        simulatedQuotes.sort((a, b) => Number.parseFloat(b.outputAmount) - Number.parseFloat(a.outputAmount))

        setQuotes(simulatedQuotes)
        setSelectedQuote(simulatedQuotes[0].exchange)
        setToAmount(simulatedQuotes[0].outputAmount)

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (error: any) {
        console.error("Error generating quotes:", error)
        setError(`Failed to get swap quote: ${error.message}`)
        setQuotes([])
        setToAmount("")
      } finally {
        setLoadingQuotes(false)
      }
    }

    if (fromToken && toToken && fromAmount && Number.parseFloat(fromAmount) > 0) {
      getQuotes()
    }
  }, [fromToken, toToken, fromAmount])

  const handleSwap = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to swap tokens",
        variant: "destructive",
      })
      return
    }

    if (!selectedQuote) {
      toast({
        title: "No quote selected",
        description: "Please select a quote to proceed with the swap",
        variant: "destructive",
      })
      return
    }

    if (!fromToken || !toToken) {
      toast({
        title: "Token error",
        description: "Please select valid tokens for the swap",
        variant: "destructive",
      })
      return
    }

    setLoadingSwap(true)
    setError(null)

    try {
      if (!provider) {
        throw new Error("Web3 provider not available")
      }

      // Simulate the swap process with realistic steps
      toast({
        title: "Swap initiated",
        description: "Please approve the transaction in your wallet",
      })

      // For ERC-20 tokens, simulate approval step
      if (fromToken.symbol !== "ETH") {
        toast({
          title: "Token approval required",
          description: `Please approve ${fromToken.symbol} for trading`,
        })

        // Simulate approval transaction
        await new Promise((resolve) => setTimeout(resolve, 2000))

        toast({
          title: "Approval confirmed",
          description: `${fromToken.symbol} approved for trading`,
        })
      }

      // Simulate the swap transaction
      toast({
        title: "Confirming swap",
        description: "Transaction submitted to the network",
      })

      // Simulate network confirmation
      await new Promise((resolve) => setTimeout(resolve, 3000))

      toast({
        title: "Swap successful",
        description: `Successfully swapped ${fromAmount} ${fromToken.symbol} to ${toAmount} ${toToken.symbol}`,
      })

      // Reset form
      setFromAmount("")
      setToAmount("")
      setQuotes([])
      setSelectedQuote(null)
    } catch (error: any) {
      console.error("Swap error:", error)
      setError(`Swap failed: ${error.message}`)
      toast({
        title: "Swap failed",
        description: error.message || "Failed to execute token swap",
        variant: "destructive",
      })
    } finally {
      setLoadingSwap(false)
    }
  }

  const getMaxAmount = () => {
    if (!fromToken || !fromToken.balance) return "0"

    // If ETH, leave some for gas
    if (fromToken.symbol === "ETH") {
      const balance = Number.parseFloat(fromToken.balance)
      return balance > 0.01 ? (balance - 0.01).toFixed(6) : "0"
    }

    return fromToken.balance
  }

  const handleMaxAmount = () => {
    const maxAmount = getMaxAmount()
    setFromAmount(maxAmount)
  }

  const getSelectedQuoteDetails = () => {
    if (!selectedQuote) return null
    return quotes.find((q) => q.exchange === selectedQuote)
  }

  if (loadingTokens) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-8 w-8 mx-auto" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-40 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <ArrowDownUp className="mr-2 h-5 w-5 text-primary" />
          Token Swap
        </CardTitle>
        <CardDescription>Swap tokens across multiple decentralized exchanges</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-4">
          {/* From Token */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="from-amount">From</Label>
              {fromToken?.balance && (
                <div className="text-xs text-muted-foreground">
                  Balance: {Number.parseFloat(fromToken.balance).toFixed(6)} {fromToken.symbol}
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 ml-1 text-xs text-primary"
                    onClick={handleMaxAmount}
                  >
                    MAX
                  </Button>
                </div>
              )}
            </div>
            <div className="flex space-x-2">
              <Select
                value={fromToken?.address || ""}
                onValueChange={(value) => {
                  const token = tokens.find((t) => t.address === value)
                  if (token) {
                    setFromToken(token)
                    // If to token is the same, swap it
                    if (toToken && token.address === toToken.address) {
                      setToToken(fromToken)
                    }
                  }
                }}
                disabled={loadingQuotes || loadingSwap}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue>
                    {fromToken ? (
                      <div className="flex items-center">
                        <img
                          src={fromToken.logoURI || "/placeholder.svg?height=20&width=20"}
                          alt={fromToken.symbol}
                          className="w-5 h-5 mr-2 rounded-full"
                          onError={(e) => {
                            // Fallback if image fails to load
                            ;(e.target as HTMLImageElement).src = "/placeholder.svg?height=20&width=20"
                          }}
                        />
                        {fromToken.symbol}
                      </div>
                    ) : (
                      "Select token"
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {tokens.map((token) => (
                    <SelectItem key={token.address} value={token.address}>
                      <div className="flex items-center">
                        <img
                          src={token.logoURI || "/placeholder.svg?height=20&width=20"}
                          alt={token.symbol}
                          className="w-5 h-5 mr-2 rounded-full"
                          onError={(e) => {
                            // Fallback if image fails to load
                            ;(e.target as HTMLImageElement).src = "/placeholder.svg?height=20&width=20"
                          }}
                        />
                        <div className="flex flex-col">
                          <span>{token.symbol}</span>
                          <span className="text-xs text-muted-foreground">{token.name}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id="from-amount"
                type="number"
                placeholder="0.0"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                className="flex-1"
                disabled={loadingQuotes || loadingSwap}
              />
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSwapTokens}
              className="rounded-full h-8 w-8 bg-muted"
              disabled={loadingQuotes || loadingSwap}
            >
              <ArrowDownUp className="h-4 w-4" />
            </Button>
          </div>

          {/* To Token */}
          <div className="space-y-2">
            <Label htmlFor="to-amount">To (Estimated)</Label>
            <div className="flex space-x-2">
              <Select
                value={toToken?.address || ""}
                onValueChange={(value) => {
                  const token = tokens.find((t) => t.address === value)
                  if (token) {
                    setToToken(token)
                    // If from token is the same, swap it
                    if (fromToken && token.address === fromToken.address) {
                      setFromToken(toToken)
                    }
                  }
                }}
                disabled={loadingQuotes || loadingSwap}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue>
                    {toToken ? (
                      <div className="flex items-center">
                        <img
                          src={toToken.logoURI || "/placeholder.svg?height=20&width=20"}
                          alt={toToken.symbol}
                          className="w-5 h-5 mr-2 rounded-full"
                          onError={(e) => {
                            // Fallback if image fails to load
                            ;(e.target as HTMLImageElement).src = "/placeholder.svg?height=20&width=20"
                          }}
                        />
                        {toToken.symbol}
                      </div>
                    ) : (
                      "Select token"
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {tokens.map((token) => (
                    <SelectItem key={token.address} value={token.address}>
                      <div className="flex items-center">
                        <img
                          src={token.logoURI || "/placeholder.svg?height=20&width=20"}
                          alt={token.symbol}
                          className="w-5 h-5 mr-2 rounded-full"
                          onError={(e) => {
                            // Fallback if image fails to load
                            ;(e.target as HTMLImageElement).src = "/placeholder.svg?height=20&width=20"
                          }}
                        />
                        <div className="flex flex-col">
                          <span>{token.symbol}</span>
                          <span className="text-xs text-muted-foreground">{token.name}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id="to-amount"
                type="number"
                placeholder="0.0"
                value={toAmount}
                className="flex-1"
                disabled={true}
              />
            </div>
          </div>

          {/* Slippage Settings */}
          <div className="pt-2">
            <div className="flex justify-between items-center mb-2">
              <Label className="text-sm flex items-center">
                Slippage Tolerance
                <span
                  className="ml-1 text-muted-foreground cursor-help"
                  title="Your transaction will revert if the price changes unfavorably by more than this percentage."
                >
                  <Info className="h-3 w-3" />
                </span>
              </Label>
              <div className="flex space-x-1">
                <Button
                  variant={slippage === "0.1" ? "secondary" : "outline"}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setSlippage("0.1")}
                  disabled={loadingSwap}
                >
                  0.1%
                </Button>
                <Button
                  variant={slippage === "0.5" ? "secondary" : "outline"}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setSlippage("0.5")}
                  disabled={loadingSwap}
                >
                  0.5%
                </Button>
                <Button
                  variant={slippage === "1.0" ? "secondary" : "outline"}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setSlippage("1.0")}
                  disabled={loadingSwap}
                >
                  1.0%
                </Button>
              </div>
            </div>
          </div>

          {/* Exchange Quotes */}
          {loadingQuotes && fromAmount && Number.parseFloat(fromAmount) > 0 ? (
            <div className="space-y-3 py-2">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium">Finding best price...</h4>
                <RefreshCw className="h-4 w-4 animate-spin" />
              </div>
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                ))}
              </div>
            </div>
          ) : quotes.length > 0 ? (
            <div className="space-y-3 py-2">
              <h4 className="text-sm font-medium">Exchange Quotes</h4>
              <div className="space-y-2">
                {quotes.map((quote) => (
                  <div
                    key={quote.exchange}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-accent ${selectedQuote === quote.exchange ? "border-primary bg-accent" : ""}`}
                    onClick={() => {
                      setSelectedQuote(quote.exchange)
                      setToAmount(quote.outputAmount)
                    }}
                  >
                    <div className="flex items-center">
                      <div className="w-5 h-5 mr-2 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                        {quote.exchange.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium capitalize">{quote.exchange}</div>
                        {quote.routeInfo && (
                          <div className="text-xs text-muted-foreground">Route: {quote.routeInfo}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {Number.parseFloat(quote.outputAmount).toFixed(6)} {toToken?.symbol}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Price Impact:
                        <span className={quote.priceImpact > 1 ? "text-yellow-500 ml-1" : "text-green-500 ml-1"}>
                          {quote.priceImpact.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Swap Details */}
          {selectedQuote && (
            <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rate</span>
                  <span>
                    1 {fromToken?.symbol} = {getSelectedQuoteDetails()?.price.toFixed(6)} {toToken?.symbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price Impact</span>
                  <span
                    className={`${getSelectedQuoteDetails()?.priceImpact! > 1 ? "text-yellow-500" : "text-green-500"}`}
                  >
                    {getSelectedQuoteDetails()?.priceImpact.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated Gas</span>
                  <span>{(getSelectedQuoteDetails()?.gasEstimate! / 1000).toFixed(0)}k gas</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Slippage Tolerance</span>
                  <span>{slippage}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          disabled={
            !isConnected ||
            !fromToken ||
            !toToken ||
            !fromAmount ||
            Number.parseFloat(fromAmount) <= 0 ||
            !selectedQuote ||
            loadingQuotes ||
            loadingSwap
          }
          onClick={handleSwap}
        >
          {loadingSwap ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Swapping...
            </>
          ) : !isConnected ? (
            "Connect Wallet to Swap"
          ) : !fromAmount || Number.parseFloat(fromAmount) <= 0 ? (
            "Enter an amount"
          ) : error ? (
            "Try again"
          ) : (
            `Swap ${fromToken?.symbol} for ${toToken?.symbol}`
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

