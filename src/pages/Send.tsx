import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowUpRight, QrCode, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, Fuel, Wallet, ChevronDown, Zap, Clock, Gauge } from "lucide-react";
import { Link } from "react-router-dom";
import BottomNav from "@/components/wallet/BottomNav";
import ChainSelector from "@/components/wallet/ChainSelector";
import QrScanner from "@/components/wallet/QrScanner";
import { getActiveRpc } from "@/lib/network-config";
import {
  getWalletAddress, unlockWallet, sendNativeTransaction, sendERC20Transaction,
  checkLockout, addressSchema, amountSchema,
  fetchBalance, fetchTokenBalance, parseRpcError,
} from "@/lib/wallet-core";
import { getActiveChainId } from "@/lib/chain-context";
import { getChainById, EVMAdapter } from "@/lib/chain-adapter";
import { getChainAssets, type ChainAsset } from "@/lib/chain-assets";
import { useChainBalances, balanceKey } from "@/hooks/use-chain-balances";
import { saveTransaction } from "@/lib/transaction-history";
import { estimateGasFee, type FeeEstimate } from "@/lib/fee-estimator";
import { useToast } from "@/hooks/use-toast";

type GasTier = "slow" | "standard" | "fast";

const TIER_ICONS = { slow: Clock, standard: Gauge, fast: Zap };
const TIER_LABELS = { slow: "Slow", standard: "Standard", fast: "Fast" };
const TIER_COLORS = { slow: "text-muted-foreground", standard: "text-primary", fast: "text-amber-400" };

const Send = () => {
  const [activeChainId, setActiveChainId] = useState<string>(getActiveChainId());
  const activeChain = useMemo(() => getChainById(activeChainId) || getChainById("gyds")!, [activeChainId]);
  const isEvm = activeChain.type === "evm";
  const isGyds = activeChain.id === "gyds";

  // Tokens available for the active chain (native + GYD + custom imports on this chain)
  const allTokens: ChainAsset[] = useMemo(
    () => getChainAssets(activeChain),
    [activeChain],
  );

  const [selectedToken, setSelectedToken] = useState<ChainAsset>(allTokens[0]);
  const [amount, setAmount]               = useState("");
  const [address, setAddress]             = useState("");
  const [password, setPassword]           = useState("");
  const [showPassword, setShowPassword]   = useState(false);
  const [sending, setSending]             = useState(false);
  const [txHash, setTxHash]               = useState<string | null>(null);
  const [txError, setTxError]             = useState<string | null>(null);
  const [scannerOpen, setScannerOpen]     = useState(false);
  const [feeEstimate, setFeeEstimate]     = useState<FeeEstimate | null>(null);
  const [loadingFee, setLoadingFee]       = useState(false);
  const [gasTier, setGasTier]             = useState<GasTier>("standard");
  const [refreshKey, setRefreshKey]       = useState(0);
  const { toast } = useToast();
  const wallet = getWalletAddress();

  // Live balances for every asset on the active chain — drives both the
  // per-chip balance hints and the selected-token MAX/overflow logic.
  const { balances, loading: loadingBalance } = useChainBalances(
    activeChain, allTokens, wallet, refreshKey,
  );
  const balance = balances[balanceKey(selectedToken)] ?? null;

  // Reset selected token when chain changes
  useEffect(() => {
    setSelectedToken(allTokens[0]);
    setAmount("");
    setTxHash(null);
    setTxError(null);
    setFeeEstimate(null);
  }, [activeChainId]); // eslint-disable-line react-hooks/exhaustive-deps

  const balanceNum   = balance !== null ? parseFloat(balance) : null;
  const amountNum    = parseFloat(amount) || 0;
  const overBalance  = balanceNum !== null && amountNum > balanceNum && amountNum > 0;

  const handleScanResult = useCallback((scannedAddress: string) => {
    setAddress(scannedAddress);
    toast({ title: "Address scanned!", description: scannedAddress.slice(0, 16) + "…" });
  }, [toast]);

  // ── Estimate fee (GYDS only — uses GYDS-specific estimator) ──
  useEffect(() => {
    if (!isGyds) { setFeeEstimate(null); return; }
    if (!wallet || !address || !amount) { setFeeEstimate(null); return; }
    try { addressSchema.parse(address); } catch { return; }
    try { amountSchema.parse(amount); } catch { return; }

    setLoadingFee(true);
    const timer = setTimeout(() => {
      estimateGasFee(wallet, address, amount).then((est) => {
        setFeeEstimate(est);
        setLoadingFee(false);
      }).catch(() => setLoadingFee(false));
    }, 500);
    return () => clearTimeout(timer);
  }, [wallet, address, amount, isGyds]);

  const selectedFee = feeEstimate
    ? { eth: feeEstimate.tiers[gasTier].totalEth, usd: feeEstimate.tiers[gasTier].totalUsd, gwei: feeEstimate.tiers[gasTier].gwei }
    : null;

  const handleSend = async () => {
    setTxError(null);
    setTxHash(null);

    if (!wallet) {
      toast({ title: "No wallet found", variant: "destructive" });
      return;
    }
    if (!isEvm) {
      toast({ title: `${activeChain.name} sending not yet supported`, description: "Switch to an EVM chain.", variant: "destructive" });
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
    if (overBalance) {
      toast({ title: "Amount exceeds balance", description: `You only have ${balance} ${selectedToken.symbol}`, variant: "destructive" });
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

      let hash: string;
      if (isGyds) {
        const rpc = await getActiveRpc();
        if (!rpc) throw new Error("No RPC available");
        if (!selectedToken.contractAddress) {
          hash = await sendNativeTransaction(unlockedWallet, address, amount, rpc);
        } else {
          hash = await sendERC20Transaction(unlockedWallet, selectedToken.contractAddress, address, amount, selectedToken.decimals, rpc);
        }
      } else {
        const adapter = new EVMAdapter(activeChain);
        const result = await adapter.sendTransaction(unlockedWallet, {
          chainId: activeChain.id,
          from: wallet,
          to: address,
          value: amount,
          tokenAddress: selectedToken.contractAddress || undefined,
          tokenDecimals: selectedToken.contractAddress ? selectedToken.decimals : undefined,
        });
        hash = result.hash;
      }

      setTxHash(hash);

      saveTransaction({
        type: "sent", symbol: selectedToken.symbol, amount,
        toAddress: address, fromAddress: wallet,
        txHash: hash, timestamp: Date.now(), status: "confirmed",
      });

      // Refresh balances for all chain assets
      setRefreshKey((k) => k + 1);

      toast({ title: "Transaction sent!", description: `TX: ${hash.slice(0, 10)}…` });
    } catch (err: unknown) {
      const friendly = parseRpcError(err);
      setTxError(friendly);
      toast({ title: "Transaction failed", description: friendly, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="w-10 h-10 rounded-full bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-display font-bold text-foreground flex-1">Send Crypto</h1>
          <ChainSelector onChainChange={setActiveChainId} />
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {/* From address */}
          {wallet && (
            <div className="flex items-center gap-2 bg-card rounded-xl px-4 py-3">
              <div className="w-2 h-2 rounded-full bg-[hsl(var(--success))]" />
              <span className="text-sm text-muted-foreground">From:</span>
              <span className="text-sm font-medium text-foreground truncate">{wallet.slice(0, 8)}…{wallet.slice(-6)}</span>
              <span className="ml-auto text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">{activeChain.name}</span>
            </div>
          )}

          {!isEvm && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300">
              {activeChain.name} sending is not yet supported in this build. Switch to an EVM chain to send.
            </div>
          )}

          {/* Token selector */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Select Token ({allTokens.length} available)</label>
            <div className="flex gap-2 flex-wrap">
              {allTokens.map((t) => {
                const tBal = balances[balanceKey(t)];
                const isActive = selectedToken.symbol === t.symbol && selectedToken.contractAddress === t.contractAddress;
                return (
                  <button
                    key={`${t.chainId}-${t.symbol}-${t.contractAddress ?? "native"}`}
                    data-testid={`token-${t.symbol}`}
                    onClick={() => { setSelectedToken(t); setAmount(""); }}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all flex flex-col items-start leading-tight ${
                      isActive
                        ? "gradient-primary text-primary-foreground glow-primary"
                        : "bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>{t.symbol}</span>
                    <span className={`text-[10px] font-normal ${isActive ? "opacity-90" : "text-muted-foreground/70"}`}>
                      {tBal !== undefined ? parseFloat(tBal).toLocaleString(undefined, { maximumFractionDigits: 4 }) : "—"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount + balance */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-muted-foreground">Amount</label>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Wallet size={11} />
                {loadingBalance ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : balance !== null ? (
                  <span className={overBalance ? "text-destructive font-semibold" : ""}>
                    {parseFloat(balance).toLocaleString(undefined, { maximumFractionDigits: 6 })} {selectedToken.symbol}
                  </span>
                ) : (
                  <span>—</span>
                )}
              </div>
            </div>

            <div className={`bg-card rounded-xl p-4 transition-colors ${overBalance ? "ring-1 ring-destructive/60" : ""}`}>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  data-testid="input-amount"
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  className="flex-1 bg-transparent text-3xl font-display font-bold text-foreground outline-none placeholder:text-muted-foreground/30 min-w-0"
                />
                {balance !== null && parseFloat(balance) > 0 && (
                  <button
                    data-testid="button-max"
                    onClick={() => setAmount(balance)}
                    className="shrink-0 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    MAX
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-sm text-muted-foreground">{selectedToken.symbol}</p>
                {overBalance && (
                  <p className="text-xs text-destructive font-semibold">Exceeds balance</p>
                )}
              </div>
            </div>
          </div>

          {/* Recipient address */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Recipient Address</label>
            <div className="bg-card rounded-xl p-4 flex items-center gap-3">
              <input
                type="text"
                placeholder="0x…"
                value={address}
                data-testid="input-address"
                onChange={(e) => setAddress(e.target.value)}
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
              />
              <button
                data-testid="button-scan-qr"
                onClick={() => setScannerOpen(true)}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <QrCode size={20} />
              </button>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Wallet Password</label>
            <div className="bg-card rounded-xl p-4 flex items-center gap-3">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password to sign"
                value={password}
                data-testid="input-password"
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !sending && handleSend()}
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
              />
              <button onClick={() => setShowPassword(!showPassword)} className="text-muted-foreground hover:text-primary transition-colors">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Fee estimate + speed tiers (GYDS only) */}
          <AnimatePresence>
            {isGyds && (feeEstimate || loadingFee) && (
              <motion.div key="fee" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-card rounded-xl p-4 space-y-3 overflow-hidden">
                <div className="flex items-center gap-2">
                  <Fuel size={15} className="text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">Network Fee</span>
                  {loadingFee && <Loader2 size={13} className="text-muted-foreground animate-spin ml-auto" />}
                  {feeEstimate?.eip1559 && (
                    <span className="ml-auto text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">EIP-1559</span>
                  )}
                </div>

                {feeEstimate && (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {(["slow", "standard", "fast"] as GasTier[]).map((tier) => {
                        const Icon = TIER_ICONS[tier];
                        const t = feeEstimate.tiers[tier];
                        return (
                          <button
                            key={tier}
                            data-testid={`gas-tier-${tier}`}
                            onClick={() => setGasTier(tier)}
                            className={`rounded-xl p-2.5 text-center transition-all border ${
                              gasTier === tier
                                ? "border-primary/60 bg-primary/10"
                                : "border-transparent bg-secondary/50 hover:bg-secondary"
                            }`}
                          >
                            <Icon size={13} className={`mx-auto mb-1 ${TIER_COLORS[tier]}`} />
                            <p className={`text-[10px] font-semibold ${gasTier === tier ? "text-foreground" : "text-muted-foreground"}`}>{TIER_LABELS[tier]}</p>
                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{t.gwei} Gwei</p>
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 text-xs text-muted-foreground pt-1 border-t border-border/40">
                      <span>Gas limit</span>
                      <span className="text-right font-mono">{feeEstimate.gasLimit.toLocaleString()}</span>
                      <span>Fee</span>
                      <span className="text-right font-mono text-foreground">
                        {selectedFee?.eth} {activeChain.symbol}
                      </span>
                      <span>≈ USD</span>
                      <span className="text-right font-mono">{selectedFee?.usd}</span>
                    </div>
                  </>
                )}
              </motion.div>
            )}
            {!isGyds && isEvm && (
              <motion.div key="fee-other" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-card rounded-xl p-3 flex items-center gap-2 text-xs text-muted-foreground overflow-hidden">
                <Fuel size={13} /> Network fee paid in {activeChain.symbol} — estimated by the chain at signing time.
              </motion.div>
            )}
          </AnimatePresence>

          {/* TX result */}
          <AnimatePresence>
            {txHash && (
              <motion.div key="success" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-[hsl(var(--success))]/10 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle2 size={20} className="text-[hsl(var(--success))] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Transaction Sent</p>
                  <a href={`${activeChain.blockExplorer}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline break-all">
                    {txHash}
                  </a>
                </div>
              </motion.div>
            )}
            {txError && (
              <motion.div key="error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-destructive/10 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle size={20} className="text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Transaction Failed</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{txError}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Send button */}
          <button
            data-testid="button-send"
            onClick={handleSend}
            disabled={sending || overBalance || !isEvm}
            className="w-full gradient-primary text-primary-foreground font-semibold py-4 rounded-xl glow-primary hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? <Loader2 size={20} className="animate-spin" /> : <ArrowUpRight size={20} />}
            {sending ? "Signing & Broadcasting…" : `Send ${selectedToken.symbol}`}
          </button>

          {isGyds && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center pb-2">
              <ChevronDown size={12} />
              <span>Adjust gas tier above before sending</span>
            </div>
          )}
        </motion.div>
      </div>

      <QrScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleScanResult} />
      <BottomNav />
    </div>
  );
};

export default Send;
