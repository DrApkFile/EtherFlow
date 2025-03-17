"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useTheme } from "next-themes"
import { Flame, Clock, Zap, RefreshCw, TrendingUp, TrendingDown, AlertCircle } from "lucide-react"
import { ethers } from "ethers"
import { useWeb3 } from "@/context/web3-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface GasPrice {
  slow: {
    gwei: number
    usd: number
    waitTime: string
  }
  standard: {
    gwei: number
    usd: number
    waitTime: string
  }
  fast: {
    gwei: number
    usd: number
    waitTime: string
  }
  rapid: {
    gwei: number
    usd: number
    waitTime: string
  }
  baseFee: number
  lastUpdated: Date
}

// Helper function to handle ethers v5 and v6 compatibility
const formatUnits = (value: any, unit: string) => {
  // Check if ethers.utils exists (v5) or if formatUnits is directly on ethers (v6)
  if (ethers.utils && typeof ethers.utils.formatUnits === "function") {
    return ethers.utils.formatUnits(value, unit)
  } else if (typeof ethers.formatUnits === "function") {
    return ethers.formatUnits(value, unit)
  } else {
    // Fallback implementation if neither is available
    const divisor = unit === "gwei" ? 1e9 : 1e18
    return (Number(value) / divisor).toString()
  }
}

export default function GasTracker() {
  const [gasPrice, setGasPrice] = useState<GasPrice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trend, setTrend] = useState<"up" | "down" | "stable">("stable")
  const { theme } = useTheme()
  const { provider } = useWeb3()
  const [ethPrice, setEthPrice] = useState<number | null>(null)

  // Fetch ETH price in USD
  const fetchEthPrice = async () => {
    try {
      // For demo purposes, we'll use a simulated price to avoid CORS issues
      // In a production app, you would proxy these requests through your backend

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Return a realistic ETH price with some variance
      const simulatedPrice = 3000 + (Math.random() * 200 - 100) // $2900-$3100
      setEthPrice(simulatedPrice)
      return simulatedPrice
    } catch (error: any) {
      console.error("Error fetching ETH price:", error)
      setError(`Could not fetch current ETH price: ${error.message}`)
      return 3000 // Fallback to a reasonable estimate
    }
  }

  const fetchGasPrices = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get current ETH price if not already fetched
      const currentEthPrice = ethPrice || (await fetchEthPrice()) || 0

      // Check if we have a provider
      if (!provider) {
        throw new Error("Web3 provider not available. Please connect your wallet.")
      }

      let baseFeeGwei = 0
      let maxPriorityFeeGwei = 0

      // First try to get fee data using getFeeData if available (ethers v5+)
      try {
        if (typeof provider.getFeeData === "function") {
          const feeData = await provider.getFeeData()

          if (feeData.maxFeePerGas) {
            // If we have EIP-1559 data
            baseFeeGwei = Number(formatUnits(feeData.maxFeePerGas, "gwei")) / 2
            maxPriorityFeeGwei = feeData.maxPriorityFeePerGas
              ? Number(formatUnits(feeData.maxPriorityFeePerGas, "gwei"))
              : 1.5
          } else if (feeData.gasPrice) {
            // Legacy gas pricing
            baseFeeGwei = Number(formatUnits(feeData.gasPrice, "gwei"))
            maxPriorityFeeGwei = baseFeeGwei * 0.1 // Estimate
          }
        } else if (typeof provider.getGasPrice === "function") {
          // Fallback to getGasPrice for older ethers versions
          const gasPrice = await provider.getGasPrice()
          baseFeeGwei = Number(formatUnits(gasPrice, "gwei"))
          maxPriorityFeeGwei = baseFeeGwei * 0.1 // Estimate
        } else if (provider.provider && typeof provider.provider.getGasPrice === "function") {
          // Try provider.provider (ethers v6)
          const gasPrice = await provider.provider.getGasPrice()
          baseFeeGwei = Number(formatUnits(gasPrice, "gwei"))
          maxPriorityFeeGwei = baseFeeGwei * 0.1 // Estimate
        } else {
          // Direct RPC call as last resort
          const gasHex = await (window as any).ethereum?.request?.({
            method: "eth_gasPrice",
          })

          if (gasHex) {
            // Convert hex to number
            const gasPrice = Number.parseInt(gasHex, 16)
            baseFeeGwei = Number(formatUnits(gasPrice.toString(), "gwei"))
            maxPriorityFeeGwei = baseFeeGwei * 0.1 // Estimate
          } else {
            throw new Error("Failed to retrieve gas price")
          }
        }
      } catch (gasError) {
        console.error("Error fetching gas data:", gasError)
        throw new Error(
          `Could not retrieve gas prices: ${gasError instanceof Error ? gasError.message : String(gasError)}`,
        )
      }

      // Calculate gas prices for different speed tiers
      const calculateGasPrice = (multiplier: number) => {
        const gwei = Math.round(baseFeeGwei + maxPriorityFeeGwei * multiplier)
        const gasUnitsUsed = 21000 // Standard ETH transfer
        const ethCost = gwei * 1e-9 * gasUnitsUsed
        return {
          gwei,
          usd: ethCost * (currentEthPrice || 0),
          waitTime: getWaitTime(multiplier),
        }
      }

      // Get estimated wait times based on priority
      const getWaitTime = (priorityMultiplier: number): string => {
        if (priorityMultiplier <= 0.5) return "~5 min"
        if (priorityMultiplier <= 1) return "~2 min"
        if (priorityMultiplier <= 2) return "~30 sec"
        return "~15 sec"
      }

      // Determine price trend
      const previousBaseFee = gasPrice?.baseFee || 0
      let newTrend: "up" | "down" | "stable" = "stable"

      if (baseFeeGwei > previousBaseFee * 1.05) {
        newTrend = "up"
      } else if (baseFeeGwei < previousBaseFee * 0.95) {
        newTrend = "down"
      }

      setTrend(newTrend)

      // Set the gas prices for different speed tiers
      setGasPrice({
        slow: calculateGasPrice(0.5),
        standard: calculateGasPrice(1),
        fast: calculateGasPrice(2),
        rapid: calculateGasPrice(3),
        baseFee: baseFeeGwei,
        lastUpdated: new Date(),
      })
    } catch (err: any) {
      console.error("Error in gas price fetching:", err)
      setError(err.message || "Failed to fetch gas prices")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Fetch ETH price first, then gas prices
    const initData = async () => {
      await fetchEthPrice()
      fetchGasPrices()
    }

    initData()

    // Set up polling for real-time updates
    const intervalId = setInterval(fetchGasPrices, 15000) // Update every 15 seconds

    return () => clearInterval(intervalId)
  }, [provider])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }

  const getTrendIcon = () => {
    if (trend === "up") {
      return <TrendingUp className="h-4 w-4 text-red-500" />
    } else if (trend === "down") {
      return <TrendingDown className="h-4 w-4 text-green-500" />
    }
    return null
  }

  const getGasCardColor = (type: "slow" | "standard" | "fast" | "rapid") => {
    const baseClasses = "flex flex-col items-center justify-between p-3 rounded-lg"

    if (theme === "dark") {
      switch (type) {
        case "slow":
          return `${baseClasses} bg-blue-900/20 border border-blue-800`
        case "standard":
          return `${baseClasses} bg-green-900/20 border border-green-800`
        case "fast":
          return `${baseClasses} bg-yellow-900/20 border border-yellow-800`
        case "rapid":
          return `${baseClasses} bg-red-900/20 border border-red-800`
      }
    } else {
      switch (type) {
        case "slow":
          return `${baseClasses} bg-blue-50 border border-blue-200`
        case "standard":
          return `${baseClasses} bg-green-50 border border-green-200`
        case "fast":
          return `${baseClasses} bg-yellow-50 border border-yellow-200`
        case "rapid":
          return `${baseClasses} bg-red-50 border border-red-200`
      }
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg flex items-center">
              <Flame className="mr-2 h-5 w-5 text-orange-500" />
              Ethereum Gas Tracker
              {!loading && trend !== "stable" && <span className="ml-2">{getTrendIcon()}</span>}
            </CardTitle>
            <CardDescription>Real-time gas prices for Ethereum transactions</CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1 text-xs cursor-pointer" onClick={fetchGasPrices}>
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Updating..." : gasPrice ? `Updated: ${formatTime(gasPrice.lastUpdated)}` : "Update"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex flex-col gap-2">
                <span>{error}</span>
                <Button onClick={fetchGasPrices} variant="outline" size="sm" className="self-start">
                  <RefreshCw className="mr-2 h-3 w-3" /> Try again
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : loading && !gasPrice ? (
          <div className="grid grid-cols-4 gap-3">
            {Array(4)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="flex flex-col items-center space-y-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
          </div>
        ) : gasPrice ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={getGasCardColor("slow")}>
              <div className="flex items-center mb-1">
                <Clock className="h-4 w-4 mr-1 text-blue-500" />
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Slow</span>
              </div>
              <div className="text-xl font-bold">{gasPrice.slow.gwei} Gwei</div>
              <div className="text-xs text-muted-foreground mt-1">${gasPrice.slow.usd.toFixed(4)}</div>
              <div className="text-xs mt-1">{gasPrice.slow.waitTime}</div>
            </div>

            <div className={getGasCardColor("standard")}>
              <div className="flex items-center mb-1">
                <Zap className="h-4 w-4 mr-1 text-green-500" />
                <span className="text-sm font-medium text-green-600 dark:text-green-400">Standard</span>
              </div>
              <div className="text-xl font-bold">{gasPrice.standard.gwei} Gwei</div>
              <div className="text-xs text-muted-foreground mt-1">${gasPrice.standard.usd.toFixed(4)}</div>
              <div className="text-xs mt-1">{gasPrice.standard.waitTime}</div>
            </div>

            <div className={getGasCardColor("fast")}>
              <div className="flex items-center mb-1">
                <Zap className="h-4 w-4 mr-1 text-yellow-500" />
                <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Fast</span>
              </div>
              <div className="text-xl font-bold">{gasPrice.fast.gwei} Gwei</div>
              <div className="text-xs text-muted-foreground mt-1">${gasPrice.fast.usd.toFixed(4)}</div>
              <div className="text-xs mt-1">{gasPrice.fast.waitTime}</div>
            </div>

            <div className={getGasCardColor("rapid")}>
              <div className="flex items-center mb-1">
                <Zap className="h-4 w-4 mr-1 text-red-500" />
                <span className="text-sm font-medium text-red-600 dark:text-red-400">Rapid</span>
              </div>
              <div className="text-xl font-bold">{gasPrice.rapid.gwei} Gwei</div>
              <div className="text-xs text-muted-foreground mt-1">${gasPrice.rapid.usd.toFixed(4)}</div>
              <div className="text-xs mt-1">{gasPrice.rapid.waitTime}</div>
            </div>
          </div>
        ) : null}

        <div className="mt-4 text-xs text-muted-foreground">
          <p>
            Gas prices indicate the fee required for transactions to be processed on the Ethereum network. Higher gas
            prices result in faster transaction confirmations.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

