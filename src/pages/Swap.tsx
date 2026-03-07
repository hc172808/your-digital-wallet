import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownUp, ChevronDown, Info, Zap } from "lucide-react";
import BottomNav from "@/components/wallet/BottomNav";
import { useToast } from "@/hooks/use-toast";

const TOKENS = [
  { symbol: "BTC", name: "Bitcoin", price: 67432.1, balance: 0.2145, color: "from-amber-500 to-orange-500" },
  { symbol: "ETH", name: "Ethereum", price: 3521.4, balance: 1.832, color: "from-blue-400 to-indigo-500" },
  { symbol: "SOL", name: "Solana", price: 178.9, balance: 12.5, color: "from-purple-500 to-fuchsia-500" },
  { symbol: "USDT", name: "Tether", price: 1.0, balance: 1367.72, color: "from-emerald-400 to-green-500" },
  { symbol: "AVAX", name: "Avalanche", price: 42.15, balance: 25.0, color: "from-red-400 to-rose-500" },
  { symbol: "MATIC", name: "Polygon", price: 0.92, balance: 500.0, color: "from-violet-500 to-purple-500" },
  { symbol: "GYDS", name: "GYDS Network", price: 0.15, balance: 10000.0, color: "from-cyan-400 to-teal-500", network: { rpcUrl: "https://rpc.netlifegy.com", chainId: 13370, chainIdHex: "0x343A", decimals: 18, explorer: "https://explorer.netlifegy.com" } },
];

const Swap = () => {
  const { toast } = useToast();
  const [fromToken, setFromToken] = useState(TOKENS[0]);
  const [toToken, setToToken] = useState(TOKENS[1]);
  const [fromAmount, setFromAmount] = useState("");
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const toAmount = fromAmount
    ? ((parseFloat(fromAmount) * fromToken.price) / toToken.price).toFixed(6)
    : "";

  const rate = (fromToken.price / toToken.price).toFixed(6);

  const handleSwapTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount("");
  };

  const handleSwap = () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      toast({ title: "Enter an amount", description: "Please enter a valid amount to swap.", variant: "destructive" });
      return;
    }
    if (parseFloat(fromAmount) > fromToken.balance) {
      toast({ title: "Insufficient balance", description: `You only have ${fromToken.balance} ${fromToken.symbol}.`, variant: "destructive" });
      return;
    }
    toast({ title: "Swap Initiated", description: `Swapping ${fromAmount} ${fromToken.symbol} → ${toAmount} ${toToken.symbol}` });
    setFromAmount("");
  };

  const TokenPicker = ({ onSelect, exclude, onClose }: { onSelect: (t: typeof TOKENS[0]) => void; exclude: string; onClose: () => void }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="absolute inset-x-0 top-full mt-2 bg-card border border-border rounded-xl p-2 z-50 shadow-xl"
    >
      {TOKENS.filter((t) => t.symbol !== exclude).map((token) => (
        <button
          key={token.symbol}
          onClick={() => { onSelect(token); onClose(); }}
          className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-secondary/50 transition-colors"
        >
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${token.color} flex items-center justify-center text-xs font-bold text-foreground`}>
            {token.symbol.charAt(0)}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">{token.symbol}</p>
            <p className="text-xs text-muted-foreground">{token.name}</p>
          </div>
          <p className="ml-auto text-xs text-muted-foreground">{token.balance}</p>
        </button>
      ))}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-display font-bold text-foreground">Swap</h1>
          <button className="w-10 h-10 rounded-full bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Info size={20} />
          </button>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          {/* From */}
          <div className="bg-card rounded-xl p-4 relative">
            <p className="text-xs text-muted-foreground mb-2">You Pay</p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                placeholder="0.00"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                className="flex-1 bg-transparent text-2xl font-display font-bold text-foreground outline-none placeholder:text-muted-foreground/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <div className="relative">
                <button
                  onClick={() => { setShowFromPicker(!showFromPicker); setShowToPicker(false); }}
                  className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2"
                >
                  <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${fromToken.color}`} />
                  <span className="font-semibold text-foreground text-sm">{fromToken.symbol}</span>
                  <ChevronDown size={14} className="text-muted-foreground" />
                </button>
                {showFromPicker && (
                  <TokenPicker
                    onSelect={setFromToken}
                    exclude={toToken.symbol}
                    onClose={() => setShowFromPicker(false)}
                  />
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Balance: {fromToken.balance} {fromToken.symbol}</p>
          </div>

          {/* Swap button */}
          <div className="flex justify-center -my-3 relative z-10">
            <button
              onClick={handleSwapTokens}
              className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground shadow-lg hover:scale-110 transition-transform"
            >
              <ArrowDownUp size={18} />
            </button>
          </div>

          {/* To */}
          <div className="bg-card rounded-xl p-4 relative">
            <p className="text-xs text-muted-foreground mb-2">You Receive</p>
            <div className="flex items-center gap-3">
              <p className="flex-1 text-2xl font-display font-bold text-foreground">
                {toAmount || <span className="text-muted-foreground/40">0.00</span>}
              </p>
              <div className="relative">
                <button
                  onClick={() => { setShowToPicker(!showToPicker); setShowFromPicker(false); }}
                  className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2"
                >
                  <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${toToken.color}`} />
                  <span className="font-semibold text-foreground text-sm">{toToken.symbol}</span>
                  <ChevronDown size={14} className="text-muted-foreground" />
                </button>
                {showToPicker && (
                  <TokenPicker
                    onSelect={setToToken}
                    exclude={fromToken.symbol}
                    onClose={() => setShowToPicker(false)}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Rate info */}
          <div className="bg-card rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Rate</span>
              <span className="text-foreground">1 {fromToken.symbol} = {rate} {toToken.symbol}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Fee</span>
              <span className="text-foreground flex items-center gap-1">
                <Zap size={12} className="text-primary" /> 0.3%
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Slippage</span>
              <span className="text-foreground">0.5%</span>
            </div>
          </div>

          {/* Swap CTA */}
          <button
            onClick={handleSwap}
            className="w-full gradient-primary text-primary-foreground font-display font-bold py-4 rounded-xl text-lg hover:opacity-90 transition-opacity glow-primary"
          >
            Swap {fromToken.symbol} → {toToken.symbol}
          </button>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Swap;
