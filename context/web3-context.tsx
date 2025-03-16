"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { ethers } from "ethers"

interface Web3ContextType {
  account: string
  balance: string
  isConnected: boolean
  isConnecting: boolean
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  sendTransaction: (to: string, amount: string) => Promise<void>
  refreshBalance: () => Promise<void>
  provider: ethers.providers.Web3Provider | null
}

const Web3Context = createContext<Web3ContextType>({
  account: "",
  balance: "0",
  isConnected: false,
  isConnecting: false,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  sendTransaction: async () => {},
  refreshBalance: async () => {},
  provider: null,
})

export const useWeb3 = () => useContext(Web3Context)

export const Web3Provider = ({ children }: { children: ReactNode }) => {
  const [account, setAccount] = useState("")
  const [balance, setBalance] = useState("0")
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null)

  // Check if MetaMask is installed
  const checkIfMetaMaskIsInstalled = () => {
    const { ethereum } = window as any
    return Boolean(ethereum && ethereum.isMetaMask)
  }

  // Initialize provider
  useEffect(() => {
    const initProvider = async () => {
      if (typeof window !== "undefined" && checkIfMetaMaskIsInstalled()) {
        const provider = new ethers.providers.Web3Provider((window as any).ethereum)
        setProvider(provider)

        // Check if already connected
        try {
          const accounts = await provider.listAccounts()
          if (accounts.length > 0) {
            setAccount(accounts[0])
            setIsConnected(true)
            const balance = await provider.getBalance(accounts[0])
            setBalance(ethers.utils.formatEther(balance))
          }
        } catch (error) {
          console.error("Failed to get accounts", error)
        }
      }
    }

    initProvider()
  }, [])

  // Listen for account changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const { ethereum } = window as any

      if (ethereum) {
        const handleAccountsChanged = (accounts: string[]) => {
          if (accounts.length === 0) {
            // User disconnected
            setAccount("")
            setBalance("0")
            setIsConnected(false)
          } else if (accounts[0] !== account) {
            setAccount(accounts[0])
            setIsConnected(true)
            refreshBalance()
          }
        }

        ethereum.on("accountsChanged", handleAccountsChanged)

        return () => {
          ethereum.removeListener("accountsChanged", handleAccountsChanged)
        }
      }
    }
  }, [account])

  const connectWallet = async () => {
    if (!checkIfMetaMaskIsInstalled()) {
      throw new Error("MetaMask is not installed. Please install MetaMask to continue.")
    }

    try {
      setIsConnecting(true)
      const { ethereum } = window as any
      const accounts = await ethereum.request({ method: "eth_requestAccounts" })

      if (accounts.length > 0) {
        setAccount(accounts[0])
        setIsConnected(true)
        await refreshBalance()
      }
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error("User rejected the connection request")
      } else {
        throw new Error("Failed to connect to MetaMask")
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setAccount("")
    setBalance("0")
    setIsConnected(false)
  }

  const refreshBalance = async () => {
    if (!provider || !account) return

    try {
      const balance = await provider.getBalance(account)
      setBalance(ethers.utils.formatEther(balance))
      return balance
    } catch (error) {
      console.error("Failed to fetch balance", error)
      throw error
    }
  }

  const sendTransaction = async (to: string, amount: string) => {
    if (!provider || !account) {
      throw new Error("Wallet not connected")
    }

    try {
      const signer = provider.getSigner()
      const tx = await signer.sendTransaction({
        to,
        value: ethers.utils.parseEther(amount),
      })

      await tx.wait()
      await refreshBalance()
      return tx
    } catch (error: any) {
      if (error.code === "INSUFFICIENT_FUNDS") {
        throw new Error("Insufficient funds for this transaction")
      } else if (error.code === 4001) {
        throw new Error("Transaction rejected by user")
      } else {
        console.error("Transaction error:", error)
        throw new Error("Failed to send transaction")
      }
    }
  }

  return (
    <Web3Context.Provider
      value={{
        account,
        balance,
        isConnected,
        isConnecting,
        connectWallet,
        disconnectWallet,
        sendTransaction,
        refreshBalance,
        provider,
      }}
    >
      {children}
    </Web3Context.Provider>
  )
}

