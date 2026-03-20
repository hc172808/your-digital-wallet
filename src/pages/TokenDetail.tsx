import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, TrendingDown, ExternalLink, Copy, ArrowUpRight, ArrowDownLeft, ArrowDownUp, Coins, Hash, FileText, Clock, Loader2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import BottomNav from "@/components/wallet/BottomNav";
import { getNetworkConfig } from "@/lib/network-config";
import { getCustomTokens } from "@/lib/custom-tokens";
import { fetchNativeBalance, fetchTokenBalance } from "@/lib/balance-fetcher";
import { fetchPrices, fetchPriceHistory, formatPrice, formatChange, getCoinGeckoId, type PriceHistoryPoint } from "@/lib/price-fetcher";
import { useToast } from "@/hooks/use-toast";
import { getWalletAddress } from "@/lib/wallet-core";
import TokenChat from "@/components/wallet/TokenChat";
import CoinIcon from "@/components/wallet/CoinIcon";

interface TokenInfo {
  symbol: string;
  name: string;
  color: string;
  contractAddress?: string;
  decimals: number;
  description: string;
}

const KNOWN_TOKENS: Record<string, TokenInfo> = {
  GYDS: { symbol: "GYDS", name: "GYDS Network", color: "from-cyan-400 to-teal-500", decimals: 18, description: "GYDS is the native token of the GYDS Network (Chain ID: 13370). It powers transactions, gas fees, and governance on the network." },
  GYD: { symbol: "GYD", name: "GYD Stablecoin", color: "from-sky-400 to-cyan-500", decimals: 18, description: "GYD is a stablecoin on the GYDS Network pegged to 1 USD. Used for payments, transfers, and DeFi applications." },
};

type TimeRange = "7D" | "30D" | "1Y";
const DAYS_MAP: Record<TimeRange, number> = { "7D": 7, "30D": 30, "1Y": 365 };

// Fallback: generate synthetic chart data for tokens not on CoinGecko
const generateFallbackData = (range: TimeRange): PriceHistoryPoint[] => {
  const points = DAYS_MAP[range];
  const data: PriceHistoryPoint[] = [];
  let price = 0.15;
  for (let i = 0; i < points; i++) {
    price += (Math.random() - 0.48) * 0.005;
    price = Math.max(price, 0.01);
    const d = new Date();
    d.setDate(d.getDate() - (points - i));
    data.push({
      date: range === "1Y"
        ? d.toLocaleDateString("en", { month: "short" })
        : d.toLocaleDateString("en", { month: "short", day: "numeric" }),
      price: parseFloat(price.toFixed(4)),
    });
  }
  return data;
};

const ChartTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground">{payload[0]?.payload?.date}</p>
      <p className="text-sm font-semibold text-foreground">${payload[0]?.value?.toLocaleString()}</p>
    </div>
  );
};

const TokenDetail = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const config = getNetworkConfig();
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<TimeRange>("30D");
  const [livePrice, setLivePrice] = useState<{ usd: number; change: number } | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [balance, setBalance] = useState<string>("—");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Resolve token info
  let token: TokenInfo | null = null;
  if (symbol && KNOWN_TOKENS[symbol.toUpperCase()]) {
    token = KNOWN_TOKENS[symbol.toUpperCase()];
  } else if (symbol) {
    const custom = getCustomTokens().find((t) => t.symbol.toUpperCase() === symbol.toUpperCase());
    if (custom) {
      token = {
        symbol: custom.symbol, name: custom.name, color: custom.color,
        contractAddress: custom.contractAddress, decimals: custom.decimals,
        description: `${custom.name} (${custom.symbol}) is a custom imported ERC-20 token on the GYDS Network.`,
      };
    }
  }

  const hasCoinGecko = token ? !!getCoinGeckoId(token.symbol) : false;

  // Get wallet address from internal wallet
  useEffect(() => {
    setWalletAddress(getWalletAddress());
  }, []);

  useEffect(() => {
    if (!walletAddress || !token) return;
    const fetchBal = async () => {
      if (token!.symbol === "GYDS") {
        const bal = await fetchNativeBalance(walletAddress);
        setBalance(bal);
      } else if (token!.contractAddress) {
        const bal = await fetchTokenBalance(token!.contractAddress, walletAddress, token!.decimals);
        setBalance(bal);
      } else {
        setBalance("0");
      }
    };
    fetchBal();
    const interval = setInterval(fetchBal, 30000);
    return () => clearInterval(interval);
  }, [walletAddress, token?.symbol]);

  // Fetch live price from CoinGecko
  useEffect(() => {
    if (!token || !hasCoinGecko) return;
    fetchPrices([token.symbol]).then((data) => {
      const p = data[token!.symbol.toUpperCase()];
      if (p) setLivePrice({ usd: p.usd, change: p.usd_24h_change });
    });
    const interval = setInterval(() => {
      fetchPrices([token!.symbol]).then((data) => {
        const p = data[token!.symbol.toUpperCase()];
        if (p) setLivePrice({ usd: p.usd, change: p.usd_24h_change });
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [token?.symbol, hasCoinGecko]);

  // Fetch price chart
  useEffect(() => {
    if (!token) return;
    setLoadingChart(true);
    if (hasCoinGecko) {
      fetchPriceHistory(token.symbol, DAYS_MAP[timeRange]).then((data) => {
        setPriceHistory(data.length > 0 ? data : generateFallbackData(timeRange));
        setLoadingChart(false);
      });
    } else {
      setPriceHistory(generateFallbackData(timeRange));
      setLoadingChart(false);
    }
  }, [token?.symbol, timeRange, hasCoinGecko]);

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground font-semibold mb-2">Token not found</p>
          <Link to="/" className="text-primary text-sm">Go back</Link>
        </div>
      </div>
    );
  }

  const priceDisplay = livePrice ? formatPrice(livePrice.usd) : "—";
  const changeInfo = livePrice ? formatChange(livePrice.change) : { text: "—", up: true };
  const balanceUsd = livePrice && balance !== "—"
    ? `$${(parseFloat(balance.replace(/,/g, "")) * livePrice.usd).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "—";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const details = [
    { icon: Coins, label: "Symbol", value: token.symbol },
    { icon: Hash, label: "Decimals", value: String(token.decimals) },
    ...(token.contractAddress ? [{ icon: FileText, label: "Contract", value: token.contractAddress }] : []),
    { icon: Hash, label: "Network", value: config.name },
    { icon: Hash, label: "Chain ID", value: String(config.chainId) },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft size={20} />
          <span className="font-medium">Back</span>
        </Link>

        {/* Token Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${token.color} flex items-center justify-center text-2xl font-bold text-foreground mx-auto mb-4`}>
            {token.symbol.charAt(0)}
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">{token.name}</h1>
          <p className="text-muted-foreground text-sm">{token.symbol}</p>
        </motion.div>

        {/* Price Card — live data */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Price {hasCoinGecko ? "(Live)" : ""}</span>
            {changeInfo.text !== "—" && (
              <div className="flex items-center gap-1">
                {changeInfo.up ? <TrendingUp size={14} className="text-[hsl(var(--success))]" /> : <TrendingDown size={14} className="text-destructive" />}
                <span className={`text-sm font-medium ${changeInfo.up ? "text-[hsl(var(--success))]" : "text-destructive"}`}>{changeInfo.text}</span>
              </div>
            )}
          </div>
          <p className="text-3xl font-display font-bold text-foreground">{priceDisplay}</p>
        </motion.div>

        {/* Price Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="bg-card rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground">Price Chart</span>
            <div className="flex gap-1">
              {(["7D", "30D", "1Y"] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    timeRange === range
                      ? "gradient-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[180px]">
            {loadingChart ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 size={24} className="text-muted-foreground animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={priceHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(160, 84%, 50%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(160, 84%, 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(220, 10%, 55%)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(220, 10%, 55%)" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="price" stroke="hsl(160, 84%, 50%)" strokeWidth={2} fill="url(#priceGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Balance — real wallet data */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl p-5 mb-4">
          <span className="text-sm text-muted-foreground">Your Balance</span>
          {walletAddress ? (
            <>
              <p className="text-2xl font-display font-bold text-foreground mt-1">{balance} {token.symbol}</p>
              <p className="text-sm text-muted-foreground">{balanceUsd}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">Connect wallet to view balance</p>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: ArrowUpRight, label: "Send", path: "/send" },
            { icon: ArrowDownLeft, label: "Receive", path: "/receive" },
            { icon: ArrowDownUp, label: "Swap", path: "/swap" },
          ].map((action) => (
            <Link key={action.label} to={action.path} className="flex flex-col items-center gap-2 bg-card rounded-2xl py-4 hover:bg-secondary/50 transition-colors">
              <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
                <action.icon size={18} className="text-primary-foreground" />
              </div>
              <span className="text-xs font-medium text-foreground">{action.label}</span>
            </Link>
          ))}
        </motion.div>

        {/* Community Chat */}
        <TokenChat symbol={token.symbol} tokenName={token.name} />

        {/* About */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} className="mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">About</h2>
          <div className="bg-card rounded-2xl p-4">
            <p className="text-sm text-foreground leading-relaxed">{token.description}</p>
          </div>
        </motion.div>

        {/* Token Details */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">Details</h2>
          <div className="bg-card rounded-2xl divide-y divide-border">
            {details.map((item) => (
              <button key={item.label} onClick={() => copyToClipboard(item.value)} className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors text-left">
                <item.icon size={16} className="text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground shrink-0">{item.label}</span>
                <span className="text-sm font-medium text-foreground ml-auto truncate max-w-[180px]">{item.value}</span>
                <Copy size={12} className="text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </motion.div>

        {/* Block Explorer Link */}
        {token.contractAddress && (
          <motion.a
            href={`${config.blockExplorer}/token/${token.contractAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26 }}
            className="flex items-center justify-center gap-2 mt-4 py-3 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <ExternalLink size={16} />
            View on Block Explorer
          </motion.a>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default TokenDetail;
