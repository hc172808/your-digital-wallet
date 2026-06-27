import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Copy, Check, Share2, Info, Loader2, Coins } from "lucide-react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import BottomNav from "@/components/wallet/BottomNav";
import ChainSelector from "@/components/wallet/ChainSelector";
import { getWalletAddress } from "@/lib/wallet-core";
import { getActiveChainId } from "@/lib/chain-context";
import { getChainById } from "@/lib/chain-adapter";
import { getChainAssets } from "@/lib/chain-assets";
import { useChainBalances, balanceKey } from "@/hooks/use-chain-balances";
import { useToast } from "@/hooks/use-toast";

const Receive = () => {
  const [copied, setCopied] = useState(false);
  const [activeChainId, setActiveChainId] = useState<string>(getActiveChainId());
  const walletAddress = getWalletAddress() || "";
  const activeChain = useMemo(() => getChainById(activeChainId) || getChainById("gyds")!, [activeChainId]);
  const assets = useMemo(() => getChainAssets(activeChain), [activeChain]);
  const { balances, loading: loadingBalances } = useChainBalances(activeChain, assets, walletAddress);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `My ${activeChain.name} Address`,
          text: walletAddress,
        });
      } catch {
        // user cancelled
      }
    } else {
      handleCopy();
      toast({ title: "Address copied!" });
    }
  };

  // QR URI per chain type. EVM: EIP-681. Solana: solana:<addr>.
  const qrValue = useMemo(() => {
    if (!walletAddress) return "";
    if (activeChain.type === "solana") return `solana:${walletAddress}`;
    const cid = activeChain.chainId ?? 1;
    return `ethereum:${walletAddress}@${cid}`;
  }, [walletAddress, activeChain]);

  const isEvm = activeChain.type === "evm";

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="w-10 h-10 rounded-full bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-display font-bold text-foreground flex-1">Receive Crypto</h1>
          <ChainSelector onChainChange={setActiveChainId} />
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Chain banner */}
          <div className="bg-card rounded-xl px-4 py-3 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Network:</span>
            <span className="text-sm font-semibold text-foreground">{activeChain.name}</span>
            <span className="ml-auto text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              {isEvm ? `Chain ${activeChain.chainId}` : "Solana"}
            </span>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white rounded-2xl p-4 shadow-lg">
              {walletAddress ? (
                <QRCodeSVG
                  value={qrValue}
                  size={200}
                  level="H"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                  No wallet found
                </div>
              )}
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Scan this QR code to send tokens on <span className="text-foreground font-semibold">{activeChain.name}</span>
          </p>

          {/* Address */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Your Wallet Address</label>
            <div className="bg-card rounded-xl p-4 flex items-center gap-3">
              <p className="flex-1 text-sm text-foreground font-mono break-all">{walletAddress}</p>
              <button onClick={handleCopy} className="text-muted-foreground hover:text-primary transition-colors shrink-0">
                {copied ? <Check size={20} className="text-[hsl(var(--success))]" /> : <Copy size={20} />}
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="flex-1 bg-card rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
            >
              {copied ? <Check size={16} className="text-[hsl(var(--success))]" /> : <Copy size={16} />}
              {copied ? "Copied!" : "Copy Address"}
            </button>
            <button
              onClick={handleShare}
              className="flex-1 gradient-primary rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Share2 size={16} />
              Share
            </button>
          </div>

          <div className="bg-card/50 border border-border/40 rounded-xl p-3 flex items-start gap-2 text-xs text-muted-foreground">
            <Info size={14} className="text-primary shrink-0 mt-0.5" />
            {isEvm ? (
              <span>
                This address accepts <span className="text-foreground font-semibold">{activeChain.symbol}</span> and any
                ERC-20 token on <span className="text-foreground font-semibold">{activeChain.name}</span>. Only send assets
                on this network — sending tokens from a different chain may result in loss of funds.
              </span>
            ) : (
              <span>
                {activeChain.name} addresses use a different key format. Receiving on {activeChain.name} requires a
                {activeChain.name}-native wallet derivation, which is not yet enabled in this build.
              </span>
            )}
          </div>

          {/* Per-chain asset list — shows what users will receive into */}
          {isEvm && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Coins size={14} /> Assets on {activeChain.name}
                </label>
                {loadingBalances && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
              </div>
              <div className="bg-card rounded-xl divide-y divide-border/40 overflow-hidden">
                {assets.map((a) => {
                  const bal = balances[balanceKey(a)];
                  return (
                    <div key={balanceKey(a)} className="flex items-center gap-3 px-4 py-3">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${a.color} flex items-center justify-center text-[11px] font-bold text-white`}>
                        {a.symbol.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{a.symbol}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{a.name}</p>
                      </div>
                      <p className="text-sm font-mono text-foreground">
                        {bal !== undefined
                          ? parseFloat(bal).toLocaleString(undefined, { maximumFractionDigits: 6 })
                          : "—"}
                      </p>
                    </div>
                  );
                })}
                {assets.length === 1 && (
                  <p className="text-[11px] text-muted-foreground px-4 py-2.5 text-center">
                    Import a token to see its balance here.
                  </p>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Receive;
