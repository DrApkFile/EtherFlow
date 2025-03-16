"use client"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useWeb3 } from "@/context/web3-context"

export default function WalletConnect() {
  const { toast } = useToast()
  const { connectWallet, isConnecting } = useWeb3()

  const handleConnect = async () => {
    try {
      await connectWallet()
    } catch (error: any) {
      toast({
        title: "Connection Error",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-10 w-10" fill="currentColor">
          <path d="M448 32C465.7 32 480 46.33 480 64C480 81.67 465.7 96 448 96H80C71.16 96 64 103.2 64 112C64 120.8 71.16 128 80 128H448C483.3 128 512 156.7 512 192V416C512 451.3 483.3 480 448 480H64C28.65 480 0 451.3 0 416V96C0 60.65 28.65 32 64 32H448zM416 336C433.7 336 448 321.7 448 304C448 286.3 433.7 272 416 272C398.3 272 384 286.3 384 304C384 321.7 398.3 336 416 336z" />
        </svg>
      </div>
      <Button onClick={handleConnect} disabled={isConnecting} className="w-full">
        {isConnecting ? "Connecting..." : "Connect MetaMask"}
      </Button>
    </div>
  )
}

