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
  provider: any // Using 'any' to accommodate different ethers versions
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

// Helper function to handle ethers v5 and v6 compatibility
const formatEther = (value: any) => {
  // Check if ethers.utils exists (v5) or if formatEther is directly on ethers (v6)
  if (ethers.utils && typeof ethers.utils.formatEther === "function") {
    return ethers.utils.formatEther(value)
  } else if (typeof ethers.formatEther === "function") {
    return ethers.formatEther(value)
  } else {
    // Fallback implementation if neither is available
    return (Number(value) / 1e18).toString()
  }
}

// Helper function to handle ethers v5 and v6 compatibility
const parseEther = (value: string) => {
  // Check if ethers.utils exists (v5) or if parseEther is directly on ethers (v6)
  if (ethers.utils && typeof ethers.utils.parseEther === "function") {
    return ethers.utils.parseEther(value)
  } else if (typeof ethers.parseEther === "function") {
    return ethers.parseEther(value)
  } else {
    // Fallback implementation if neither is available
    return (Number(value) * 1e18).toString()
  }
}

export const Web3Provider = ({ children }: { children: ReactNode }) => {
  const [account, setAccount] = useState("")
  const [balance, setBalance] = useState("0")
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [provider, setProvider] = useState<any>(null)

  // Check if MetaMask is installed
  const checkIfMetaMaskIsInstalled = () => {
    if (typeof window === "undefined") return false
    const { ethereum } = window as any
    return Boolean(ethereum && ethereum.isMetaMask)
  }

  // Initialize provider
  useEffect(() => {
    const initProvider = async () => {
      if (typeof window !== "undefined" && checkIfMetaMaskIsInstalled()) {
        try {
          // Check ethers version and use appropriate provider
          let web3Provider
          if (ethers.providers && ethers.providers.Web3Provider) {
            // ethers v5
            web3Provider = new ethers.providers.Web3Provider((window as any).ethereum)
          } else if (ethers.BrowserProvider) {
            // ethers v6
            web3Provider = new ethers.BrowserProvider((window as any).ethereum)
          } else {
            console.error("Unsupported ethers.js version")
            return
          }

          setProvider(web3Provider)

          // Check if already connected
          try {
            const accounts = await (window as any).ethereum.request({
              method: "eth_accounts",
            })

            if (accounts.length > 0) {
              setAccount(accounts[0])
              setIsConnected(true)

              // Get balance
              let ethBalance
              try {
                if (typeof web3Provider.getBalance === "function") {
                  // ethers v5
                  ethBalance = await web3Provider.getBalance(accounts[0])
                } else if (web3Provider.provider && typeof web3Provider.provider.getBalance === "function") {
                  // ethers v6
                  ethBalance = await web3Provider.provider.getBalance(accounts[0])
                } else {
                  // Fallback to direct RPC call
                  const balanceHex = await (window as any).ethereum.request({
                    method: "eth_getBalance",
                    params: [accounts[0], "latest"],
                  })

                  // Convert hex to appropriate format
                  if (ethers.BigNumber) {
                    ethBalance = ethers.BigNumber.from(balanceHex)
                  } else {
                    ethBalance = Number.parseInt(balanceHex, 16)
                  }
                }

                setBalance(formatEther(ethBalance))
              } catch (balanceError) {
                console.error("Failed to get balance", balanceError)
                setBalance("0")
              }
            }
          } catch (error) {
            console.error("Failed to get accounts", error)
          }
        } catch (error) {
          console.error("Failed to initialize provider", error)
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
      let ethBalance

      try {
        if (typeof provider.getBalance === "function") {
          // ethers v5
          ethBalance = await provider.getBalance(account)
        } else if (provider.provider && typeof provider.provider.getBalance === "function") {
          // ethers v6
          ethBalance = await provider.provider.getBalance(account)
        } else {
          // Fallback to direct RPC call
          const balanceHex = await (window as any).ethereum.request({
            method: "eth_getBalance",
            params: [account, "latest"],
          })

          // Convert hex to appropriate format
          if (ethers.BigNumber) {
            ethBalance = ethers.BigNumber.from(balanceHex)
          } else {
            ethBalance = Number.parseInt(balanceHex, 16)
          }
        }

        const formattedBalance = formatEther(ethBalance)
        setBalance(formattedBalance)
        return ethBalance
      } catch (error) {
        console.error("Failed to fetch balance", error)
        throw error
      }
    } catch (error) {
      console.error("Failed to fetch balance", error)
      throw error
    }
  }

  // Replace the entire sendTransaction function with this more direct approach
  const sendTransaction = async (to: string, amount: string) => {
    if (!account) {
      throw new Error("Wallet not connected")
    }

    try {
      console.log("Starting transaction to", to, "with amount", amount)

      // Convert the amount to wei/hex format for the transaction
      let valueInHex
      try {
        // Try to use ethers parseEther if available
        const valueInWei = parseEther(amount)
        // Convert to hex - handle both BigNumber and string/number
        if (typeof valueInWei === "object" && valueInWei.toHexString) {
          valueInHex = valueInWei.toHexString()
        } else if (typeof valueInWei === "bigint") {
          valueInHex = "0x" + valueInWei.toString(16)
        } else {
          valueInHex = "0x" + Math.floor(Number(valueInWei)).toString(16)
        }
      } catch (error) {
        console.log("Error parsing ether amount, using direct conversion:", error)
        // Fallback: Direct conversion to wei (1 ETH = 10^18 wei)
        const valueInWei = Math.floor(Number(amount) * 1e18)
        valueInHex = "0x" + valueInWei.toString(16)
      }

      console.log("Transaction value in hex:", valueInHex)

      // Use the direct MetaMask API which is most reliable
      const transactionParameters = {
        to,
        from: account,
        value: valueInHex,
        // Optional but recommended:
        gas: "0x5208", // 21000 gas in hex
      }

      console.log("Sending transaction with parameters:", transactionParameters)

      // Send the transaction using the MetaMask provider directly
      const txHash = await (window as any).ethereum.request({
        method: "eth_sendTransaction",
        params: [transactionParameters],
      })

      console.log("Transaction sent successfully, hash:", txHash)

      // Wait a moment to allow the transaction to propagate
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Refresh the balance
      await refreshBalance()

      return { hash: txHash }
    } catch (error: any) {
      console.error("Transaction error details:", error)

      // Handle specific error codes
      if (error.code === 4001) {
        throw new Error("Transaction rejected by user")
      } else if (error.code === -32603 && error.message.includes("insufficient funds")) {
        throw new Error("Insufficient funds for this transaction")
      } else {
        throw new Error(error.message || "Failed to send transaction")
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

