import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Wallet, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCustomTokens, type CustomToken } from "@/lib/custom-tokens";
import { TokenManager } from "@/components/wallet/ImportToken";
import { fetchNativeBalance, fetchAllTokenBalances, getConnectedWallet, connectWallet } from "@/lib/balance-fetcher";
import { fetchPrices, formatPrice, formatChange, type PriceData } from "@/lib/price-fetcher";

// Only GYDS (native) and GYD are built-in network tokens — no demo balances
const NATIVE_ASSETS = [
  { symbol: "GYDS", name: "GYDS Network", color: "from-cyan-400 to-teal-500", decimals: 18, contractAddress: null as string | null },
  { symbol: "GYD", name: "GYD Stablecoin", color: "from-sky-400 to-cyan-500", decimals: 18, contractAddress: null as string | null },
];

const AssetsList = () => {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({});
  const [nativeBalance, setNativeBalance] = useState<string>("0");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const customTokens = getCustomTokens();

  // Try to get connected wallet on mount
  useEffect(() => {
    getConnectedWallet().then(setWalletAddress);
  }, []);

  // Fetch live prices from CoinGecko
  useEffect(() => {
    const symbols = customTokens.map((t) => t.symbol);
    // Include any known symbols
    fetchPrices([...symbols]).then(setPrices);
    const interval = setInterval(() => {
      fetchPrices([...symbols]).then(setPrices);
    }, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, [customTokens.length]);

  // Fetch balances when wallet is connected
  useEffect(() => {
    if (!walletAddress) return;

    const fetchBalances = async () => {
      setLoadingBalances(true);
      try {
        // Fetch native GYDS balance
        const native = await fetchNativeBalance(walletAddress);
        setNativeBalance(native);

        // Fetch custom token balances
        if (customTokens.length > 0) {
          const balances = await fetchAllTokenBalances(customTokens, walletAddress);
          setTokenBalances(balances);
        }
      } catch {
        // silent
      } finally {
        setLoadingBalances(false);
      }
    };

    fetchBalances();
    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, [walletAddress, refreshKey, customTokens.length]);

  const handleConnect = async () => {
    const addr = await connectWallet();
    if (addr) setWalletAddress(addr);
  };

  // Build real asset list from wallet data only
  const allAssets = [
    // Native GYDS
    {
      symbol: "GYDS",
      name: "GYDS Network",
      price: "—",
      change: "—",
      up: true,
      amount: walletAddress ? nativeBalance : "—",
      value: walletAddress ? `${nativeBalance} GYDS` : "Connect wallet",
      color: "from-cyan-400 to-teal-500",
    },
    // GYD (would need contract address to fetch balance)
    {
      symbol: "GYD",
      name: "GYD Stablecoin",
      price: "—",
      change: "—",
      up: true,
      amount: walletAddress ? "0" : "—",
      value: walletAddress ? "0 GYD" : "Connect wallet",
      color: "from-sky-400 to-cyan-500",
    },
    // Custom imported tokens with live data
    ...customTokens.map((t: CustomToken) => {
      const priceData = prices[t.symbol.toUpperCase()];
      const balance = tokenBalances[t.symbol] || "0";
      const balanceNum = parseFloat(balance.replace(/,/g, "")) || 0;
      const usdValue = priceData ? balanceNum * priceData.usd : 0;
      const changeInfo = priceData ? formatChange(priceData.usd_24h_change) : { text: "—", up: true };

      return {
        symbol: t.symbol,
        name: t.name,
        price: priceData ? formatPrice(priceData.usd) : "—",
        change: changeInfo.text,
        up: changeInfo.up,
        amount: walletAddress ? balance : "—",
        value: walletAddress
          ? priceData && usdValue > 0
            ? `$${usdValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : `${balance} ${t.symbol}`
          : "Connect wallet",
        color: t.color,
      };
    }),
  ];

  return (
    <div>
      {/* Wallet connection banner */}
      {!walletAddress && (
        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleConnect}
          className="w-full flex items-center justify-center gap-2 bg-primary/10 text-primary rounded-xl py-2.5 mb-4 text-sm font-medium hover:bg-primary/20 transition-colors"
        >
          <Wallet size={16} />
          Connect wallet to view balances
        </motion.button>
      )}

      {walletAddress && (
        <div className="flex items-center gap-2 mb-4 px-1">
          <div className="w-2 h-2 rounded-full bg-[hsl(var(--success))]" />
          <span className="text-xs text-muted-foreground truncate">
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </span>
          {loadingBalances && <Loader2 size={12} className="text-muted-foreground animate-spin" />}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-display font-semibold text-foreground">Your Assets</h2>
      </div>
      <div className="space-y-3 mb-6">
        {allAssets.map((asset, i) => (
          <motion.div
            key={`${asset.symbol}-${refreshKey}-${i}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            onClick={() => navigate(`/token/${asset.symbol}`)}
            className="flex items-center gap-3 bg-card rounded-xl p-4 hover:bg-secondary/50 transition-colors cursor-pointer"
          >
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${asset.color} flex items-center justify-center text-sm font-bold text-foreground`}>
              {asset.symbol.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-foreground">{asset.symbol}</p>
                <p className="font-semibold text-foreground text-sm">{asset.value}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{asset.name}</p>
                <div className="flex items-center gap-1">
                  {asset.change !== "—" && (
                    <>
                      {asset.up ? (
                        <TrendingUp size={12} className="text-success" />
                      ) : (
                        <TrendingDown size={12} className="text-destructive" />
                      )}
                      <span className={`text-sm ${asset.up ? "text-success" : "text-destructive"}`}>
                        {asset.change}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <TokenManager
        onTokensChanged={() => setRefreshKey((k) => k + 1)}
        balances={tokenBalances}
      />
    </div>
  );
};

export default AssetsList;
