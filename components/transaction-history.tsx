"use client"

import { useEffect, useState } from "react"
import { ethers } from "ethers"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Transaction {
  hash: string
  from: string
  to: string
  value: string
  timestamp: number
}

export default function TransactionHistory({ address }: { address: string }) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!address) return

      try {
        setIsLoading(true)
        // In a real app, you would use an API like Etherscan or Alchemy
        // This is a placeholder for demonstration
        const response = await fetch(
          `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=YourApiKeyToken`,
        )

        if (!response.ok) {
          throw new Error("Failed to fetch transactions")
        }

        const data = await response.json()

        if (data.status === "1") {
          const formattedTransactions = data.result.slice(0, 10).map((tx: any) => ({
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            value: ethers.utils.formatEther(tx.value),
            timestamp: Number.parseInt(tx.timeStamp) * 1000,
          }))

          setTransactions(formattedTransactions)
        } else {
          // For demo purposes, create some mock transactions
          const mockTransactions = Array(5)
            .fill(0)
            .map((_, i) => ({
              hash: `0x${Array(64)
                .fill(0)
                .map(() => Math.floor(Math.random() * 16).toString(16))
                .join("")}`,
              from:
                i % 2 === 0
                  ? address
                  : `0x${Array(40)
                      .fill(0)
                      .map(() => Math.floor(Math.random() * 16).toString(16))
                      .join("")}`,
              to:
                i % 2 === 0
                  ? `0x${Array(40)
                      .fill(0)
                      .map(() => Math.floor(Math.random() * 16).toString(16))
                      .join("")}`
                  : address,
              value: (Math.random() * 0.1).toFixed(4),
              timestamp: Date.now() - i * 86400000,
            }))
          setTransactions(mockTransactions)
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to fetch transaction history",
          variant: "destructive",
        })
        // Set mock data for demonstration
        const mockTransactions = Array(5)
          .fill(0)
          .map((_, i) => ({
            hash: `0x${Array(64)
              .fill(0)
              .map(() => Math.floor(Math.random() * 16).toString(16))
              .join("")}`,
            from:
              i % 2 === 0
                ? address
                : `0x${Array(40)
                    .fill(0)
                    .map(() => Math.floor(Math.random() * 16).toString(16))
                    .join("")}`,
            to:
              i % 2 === 0
                ? `0x${Array(40)
                    .fill(0)
                    .map(() => Math.floor(Math.random() * 16).toString(16))
                    .join("")}`
                : address,
            value: (Math.random() * 0.1).toFixed(4),
            timestamp: Date.now() - i * 86400000,
          }))
        setTransactions(mockTransactions)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTransactions()

    // Set up polling for real-time updates
    const intervalId = setInterval(fetchTransactions, 30000) // Every 30 seconds

    return () => clearInterval(intervalId)
  }, [address, toast])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array(5)
          .fill(0)
          .map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
          ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return <p className="text-center py-4">No transactions found</p>
  }

  return (
    <div className="space-y-4">
      {transactions.map((tx) => (
        <Card key={tx.hash} className="p-4">
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-start">
              <div className="font-medium truncate max-w-[200px] sm:max-w-[300px]" title={tx.hash}>
                {tx.hash.substring(0, 10)}...{tx.hash.substring(tx.hash.length - 8)}
              </div>
              <a
                href={`https://etherscan.io/tx/${tx.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <div className="text-sm text-muted-foreground">{new Date(tx.timestamp).toLocaleString()}</div>
            <div className="flex justify-between items-center text-sm">
              <div>
                <span className="font-medium">From:</span>{" "}
                <span className="truncate max-w-[150px] inline-block align-bottom" title={tx.from}>
                  {tx.from === address
                    ? "You"
                    : `${tx.from.substring(0, 6)}...${tx.from.substring(tx.from.length - 4)}`}
                </span>
              </div>
              <div>
                <span className="font-medium">To:</span>{" "}
                <span className="truncate max-w-[150px] inline-block align-bottom" title={tx.to}>
                  {tx.to === address ? "You" : `${tx.to.substring(0, 6)}...${tx.to.substring(tx.to.length - 4)}`}
                </span>
              </div>
              <div>
                <span className="font-medium">Value:</span> {tx.value} ETH
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

