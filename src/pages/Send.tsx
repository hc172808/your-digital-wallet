import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, QrCode, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, Fuel } from "lucide-react";
import { Link } from "react-router-dom";
import BottomNav from "@/components/wallet/BottomNav";
import QrScanner from "@/components/wallet/QrScanner";
import { getNetworkConfig, getActiveRpc } from "@/lib/network-config";
import { getCustomTokens } from "@/lib/custom-tokens";
import { getWalletAddress, unlockWallet, sendNativeTransaction, sendERC20Transaction, checkLockout, addressSchema, amountSchema } from "@/lib/wallet-core";
import { saveTransaction } from "@/lib/transaction-history";
import { estimateGasFee, type FeeEstimate } from "@/lib/fee-estimator";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_TOKENS = [
  { symbol: "GYDS", name: "GYDS (Native)", contractAddress: null as string | null, decimals: 18 },
  { symbol: "GYD", name: "GYD Stablecoin", contractAddress: null as string | null, decimals: 18 },
];

const Send = () => {
  const [selectedToken, setSelectedToken] = useState(DEFAULT_TOKENS[0]);
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sending, setSending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [feeEstimate, setFeeEstimate] = useState<FeeEstimate | null>(null);
  const [loadingFee, setLoadingFee] = useState(false);
  const { toast } = useToast();
  const config = getNetworkConfig();
  const wallet = getWalletAddress();

  const customTokens = getCustomTokens();
  const allTokens = [
    ...DEFAULT_TOKENS,
    ...customTokens.map((t) => ({ symbol: t.symbol, name: t.name, contractAddress: t.contractAddress, decimals: t.decimals })),
  ];

  const handleScanResult = useCallback((scannedAddress: string) => {
    setAddress(scannedAddress);
    toast({ title: "Address scanned!", description: scannedAddress.slice(0, 16) + "..." });
  }, [toast]);

  const handleSend = async () => {
    setTxError(null);
    setTxHash(null);

    if (!wallet) {
      toast({ title: "No wallet found", variant: "destructive" });
      return;
    }

    try { addressSchema.parse(address); } catch {
      toast({ title: "Invalid recipient address", variant: "destructive" });
      return;
    }
    try { amountSchema.parse(amount); } catch {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    if (!password) {
      toast({ title: "Enter your wallet password", variant: "destructive" });
      return;
    }

    const lockStatus = checkLockout();
    if (lockStatus.locked) {
      toast({ title: `Wallet locked for ${lockStatus.remainingSeconds}s`, description: "Too many failed attempts", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const unlockedWallet = await unlockWallet(password);
      const rpc = await getActiveRpc();
      if (!rpc) throw new Error("No RPC available");

      let hash: string;
      if (!selectedToken.contractAddress) {
        hash = await sendNativeTransaction(unlockedWallet, address, amount, rpc);
      } else {
        hash = await sendERC20Transaction(unlockedWallet, selectedToken.contractAddress, address, amount, selectedToken.decimals, rpc);
      }
      setTxHash(hash);

      // Save to transaction history
      saveTransaction({
        type: "sent",
        symbol: selectedToken.symbol,
        amount,
        toAddress: address,
        fromAddress: wallet,
        txHash: hash,
        timestamp: Date.now(),
        status: "confirmed",
      });

      toast({ title: "Transaction sent!", description: `TX: ${hash.slice(0, 10)}...` });
    } catch (err: any) {
      const msg = err?.message || "Transaction failed";
      if (msg.includes("invalid password") || msg.includes("incorrect")) {
        setTxError("Wrong password");
      } else {
        setTxError(msg.length > 100 ? msg.slice(0, 100) + "..." : msg);
      }
      toast({ title: "Transaction failed", description: msg, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/" className="w-10 h-10 rounded-full bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-display font-bold text-foreground">Send Crypto</h1>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* From address */}
          {wallet && (
            <div className="flex items-center gap-2 bg-card rounded-xl px-4 py-3">
              <div className="w-2 h-2 rounded-full bg-[hsl(var(--success))]" />
              <span className="text-sm text-muted-foreground">From:</span>
              <span className="text-sm font-medium text-foreground truncate">{wallet.slice(0, 8)}...{wallet.slice(-6)}</span>
            </div>
          )}

          {/* Token selector */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Select Token</label>
            <div className="flex gap-2 flex-wrap">
              {allTokens.map((t) => (
                <button
                  key={t.symbol}
                  onClick={() => setSelectedToken(t)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    selectedToken.symbol === t.symbol
                      ? "gradient-primary text-primary-foreground glow-primary"
                      : "bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.symbol}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Amount</label>
            <div className="bg-card rounded-xl p-4">
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                className="w-full bg-transparent text-3xl font-display font-bold text-foreground outline-none placeholder:text-muted-foreground/30"
              />
              <p className="text-sm text-muted-foreground mt-1">{selectedToken.symbol}</p>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Recipient Address</label>
            <div className="bg-card rounded-xl p-4 flex items-center gap-3">
              <input
                type="text"
                placeholder="0x..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
              />
              <button
                onClick={() => setScannerOpen(true)}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <QrCode size={20} />
              </button>
            </div>
          </div>

          {/* Password to sign */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Wallet Password</label>
            <div className="bg-card rounded-xl p-4 flex items-center gap-3">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password to sign"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
              />
              <button onClick={() => setShowPassword(!showPassword)} className="text-muted-foreground hover:text-primary transition-colors">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* TX Result */}
          {txHash && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[hsl(var(--success))]/10 rounded-xl p-4 flex items-start gap-3">
              <CheckCircle2 size={20} className="text-[hsl(var(--success))] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Transaction Sent</p>
                <a href={`${config.blockExplorer}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline break-all">
                  {txHash}
                </a>
              </div>
            </motion.div>
          )}

          {txError && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-destructive/10 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle size={20} className="text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">Transaction Failed</p>
                <p className="text-xs text-muted-foreground">{txError}</p>
              </div>
            </motion.div>
          )}

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={sending}
            className="w-full gradient-primary text-primary-foreground font-semibold py-4 rounded-xl glow-primary hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-lg disabled:opacity-60"
          >
            {sending ? <Loader2 size={20} className="animate-spin" /> : <ArrowUpRight size={20} />}
            {sending ? "Signing..." : `Send ${selectedToken.symbol}`}
          </button>
        </motion.div>
      </div>

      {/* QR Scanner Modal */}
      <QrScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScanResult}
      />

      <BottomNav />
    </div>
  );
};

export default Send;
