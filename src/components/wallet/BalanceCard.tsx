import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownLeft, Eye, EyeOff, Wallet } from "lucide-react";
import { useState, useEffect } from "react";
import { getConnectedWallet, connectWallet, fetchNativeBalance } from "@/lib/balance-fetcher";
import { getCustomTokens } from "@/lib/custom-tokens";
import { fetchAllTokenBalances } from "@/lib/balance-fetcher";
import { fetchPrices } from "@/lib/price-fetcher";

const BalanceCard = () => {
  const [visible, setVisible] = useState(true);
  const [wallet, setWallet] = useState<string | null>(null);
  const [totalUsd, setTotalUsd] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getConnectedWallet().then(setWallet);
  }, []);

  useEffect(() => {
    if (!wallet) { setTotalUsd(0); return; }

    const calc = async () => {
      setLoading(true);
      try {
        const nativeBal = await fetchNativeBalance(wallet);
        const customTokens = getCustomTokens();
        const tokenBals = customTokens.length > 0
          ? await fetchAllTokenBalances(customTokens, wallet)
          : {};

        // Fetch prices for custom tokens
        const symbols = customTokens.map((t) => t.symbol);
        const prices = await fetchPrices(symbols);

        let total = 0;
        // Native GYDS — no CoinGecko price, skip USD
        // Custom tokens with prices
        for (const t of customTokens) {
          const bal = parseFloat((tokenBals[t.symbol] || "0").replace(/,/g, "")) || 0;
          const price = prices[t.symbol.toUpperCase()]?.usd || 0;
          total += bal * price;
        }
        setTotalUsd(total);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };

    calc();
    const interval = setInterval(calc, 60000);
    return () => clearInterval(interval);
  }, [wallet]);

  const handleConnect = async () => {
    const addr = await connectWallet();
    if (addr) setWallet(addr);
  };

  const formattedBalance = totalUsd > 0
    ? `$${totalUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "$0.00";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="gradient-primary rounded-2xl p-6 glow-primary relative overflow-hidden"
    >
      {/* Decorative circles */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-foreground/5" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-foreground/5" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium text-primary-foreground/70">Total Balance</p>
          <button onClick={() => setVisible(!visible)} className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
            {visible ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>
        <h1 className="text-4xl font-display font-bold text-primary-foreground mb-1">
          {!wallet ? "—" : visible ? formattedBalance : "••••••"}
        </h1>
        {wallet ? (
          <p className="text-xs text-primary-foreground/50 mb-6">
            {wallet.slice(0, 6)}...{wallet.slice(-4)}
          </p>
        ) : (
          <button
            onClick={handleConnect}
            className="flex items-center gap-1.5 text-sm text-primary-foreground/80 hover:text-primary-foreground mb-6 transition-colors"
          >
            <Wallet size={14} />
            Connect wallet
          </button>
        )}

        <div className="flex gap-3">
          <ActionButton icon={<ArrowUpRight size={18} />} label="Send" href="/send" />
          <ActionButton icon={<ArrowDownLeft size={18} />} label="Receive" href="/receive" />
        </div>
      </div>
    </motion.div>
  );
};

const ActionButton = ({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) => (
  <a
    href={href}
    className="flex items-center gap-2 bg-primary-foreground/15 hover:bg-primary-foreground/25 transition-colors rounded-xl px-5 py-2.5 text-sm font-semibold text-primary-foreground backdrop-blur-sm"
  >
    {icon}
    {label}
  </a>
);

export default BalanceCard;
