import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { getCustomTokens, type CustomToken } from "@/lib/custom-tokens";
import { TokenManager } from "@/components/wallet/ImportToken";

const DEFAULT_ASSETS = [
  { symbol: "BTC", name: "Bitcoin", price: "$67,432.10", change: "+3.2%", up: true, amount: "0.2145", value: "$14,464.59", color: "from-amber-500 to-orange-500" },
  { symbol: "ETH", name: "Ethereum", price: "$3,521.40", change: "+1.8%", up: true, amount: "1.8320", value: "$6,453.24", color: "from-blue-400 to-indigo-500" },
  { symbol: "SOL", name: "Solana", price: "$178.90", change: "-0.5%", up: false, amount: "12.50", value: "$2,236.25", color: "from-purple-500 to-fuchsia-500" },
  { symbol: "USDT", name: "Tether", price: "$1.00", change: "0.0%", up: true, amount: "1,367.72", value: "$1,367.72", color: "from-emerald-400 to-green-500" },
  { symbol: "GYDS", name: "GYDS Network", price: "$0.15", change: "+12.4%", up: true, amount: "10,000", value: "$1,500.00", color: "from-cyan-400 to-teal-500" },
  { symbol: "GYD", name: "GYD Stablecoin", price: "$1.00", change: "0.0%", up: true, amount: "5,000", value: "$5,000.00", color: "from-sky-400 to-cyan-500" },
];

const AssetsList = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const customTokens = getCustomTokens();

  const customAssets = customTokens.map((t: CustomToken) => ({
    symbol: t.symbol,
    name: t.name,
    price: "—",
    change: "0.0%",
    up: true,
    amount: "0",
    value: "$0.00",
    color: t.color,
  }));

  const allAssets = [...DEFAULT_ASSETS, ...customAssets];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-display font-semibold text-foreground">Your Assets</h2>
        <button className="text-sm text-muted-foreground hover:text-primary transition-colors">See All</button>
      </div>
      <div className="space-y-3 mb-6">
        {allAssets.map((asset, i) => (
          <motion.div
            key={`${asset.symbol}-${refreshKey}-${i}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className="flex items-center gap-3 bg-card rounded-xl p-4 hover:bg-secondary/50 transition-colors cursor-pointer"
          >
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${asset.color} flex items-center justify-center text-sm font-bold text-foreground`}>
              {asset.symbol.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-foreground">{asset.symbol}</p>
                <p className="font-semibold text-foreground">{asset.value}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{asset.name}</p>
                <div className="flex items-center gap-1">
                  {asset.up ? (
                    <TrendingUp size={12} className="text-success" />
                  ) : (
                    <TrendingDown size={12} className="text-destructive" />
                  )}
                  <span className={`text-sm ${asset.up ? "text-success" : "text-destructive"}`}>
                    {asset.change}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <TokenManager onTokensChanged={() => setRefreshKey((k) => k + 1)} />
    </div>
  );
};

export default AssetsList;
