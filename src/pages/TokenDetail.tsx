import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, TrendingDown, ExternalLink, Copy, ArrowUpRight, ArrowDownLeft, ArrowDownUp, Coins, Hash, FileText, Loader2, EyeOff, Eye, AlertTriangle, BarChart3, Activity } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import BottomNav from "@/components/wallet/BottomNav";
import { getNetworkConfig } from "@/lib/network-config";
import { getCustomTokens } from "@/lib/custom-tokens";
import { fetchNativeBalance, fetchTokenBalance } from "@/lib/balance-fetcher";
import { fetchPrices, fetchPriceHistory, fetchMarketData, formatPrice, formatChange, formatLargeNumber, getCoinGeckoId, type PriceHistoryPoint, type MarketData } from "@/lib/price-fetcher";
import { useToast } from "@/hooks/use-toast";
import { getWalletAddress } from "@/lib/wallet-core";
import { isTokenHidden, hideToken, unhideToken } from "@/lib/hidden-tokens";
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

type TimeRange = "1H" | "1D" | "7D" | "30D" | "1Y";
const DAYS_MAP: Record<TimeRange, number> = { "1H": 1, "1D": 1, "7D": 7, "30D": 30, "1Y": 365 };

const generateFallbackData = (range: TimeRange): PriceHistoryPoint[] => {
  const count = range === "1H" ? 60 : range === "1D" ? 24 : DAYS_MAP[range];
  const data: PriceHistoryPoint[] = [];
  let price = 0.15;
  for (let i = 0; i < count; i++) {
    price += (Math.random() - 0.48) * 0.005;
    price = Math.max(price, 0.01);
    const d = new Date();
    if (range === "1H") d.setMinutes(d.getMinutes() - (count - i));
    else if (range === "1D") d.setHours(d.getHours() - (count - i));
    else d.setDate(d.getDate() - (count - i));
    data.push({
      date: range === "1H" ? d.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })
        : range === "1D" ? d.toLocaleTimeString("en", { hour: "numeric" })
        : range === "1Y" ? d.toLocaleDateString("en", { month: "short" })
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
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [hidden, setHidden] = useState(false);

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
  const isCustom = token ? !KNOWN_TOKENS[token.symbol.toUpperCase()] : false;

  useEffect(() => {
    setWalletAddress(getWalletAddress());
    if (symbol) setHidden(isTokenHidden(symbol));
  }, [symbol]);

  useEffect(() => {
    if (!walletAddress || !token) return;
    const fetchBal = async () => {
      if (token!.symbol === "GYDS") {
        setBalance(await fetchNativeBalance(walletAddress));
      } else if (token!.contractAddress) {
        setBalance(await fetchTokenBalance(token!.contractAddress, walletAddress, token!.decimals));
      } else {
        setBalance("0");
      }
    };
    fetchBal();
    const interval = setInterval(fetchBal, 30000);
    return () => clearInterval(interval);
  }, [walletAddress, token?.symbol]);

  useEffect(() => {
    if (!token || !hasCoinGecko) return;
    const fetchLive = () => fetchPrices([token!.symbol]).then((data) => {
      const p = data[token!.symbol.toUpperCase()];
      if (p) setLivePrice({ usd: p.usd, change: p.usd_24h_change });
    });
    fetchLive();
    const interval = setInterval(fetchLive, 60000);
    return () => clearInterval(interval);
  }, [token?.symbol, hasCoinGecko]);

  // Market data
  useEffect(() => {
    if (!token || !hasCoinGecko) return;
    fetchMarketData(token.symbol).then(setMarketData);
  }, [token?.symbol, hasCoinGecko]);

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

  const toggleHide = () => {
    if (hidden) { unhideToken(token!.symbol); setHidden(false); toast({ title: "Token visible" }); }
    else { hideToken(token!.symbol); setHidden(true); toast({ title: "Token hidden from dashboard" }); }
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
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={20} />
            <span className="font-medium">Back</span>
          </Link>
          <button onClick={toggleHide} className="text-muted-foreground hover:text-foreground transition-colors">
            {hidden ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>
        </div>

        {/* Unverified token warning */}
        {isCustom && !hasCoinGecko && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-4 flex items-center gap-3">
            <AlertTriangle size={18} className="text-yellow-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-yellow-500">Unverified Token</p>
              <p className="text-xs text-muted-foreground">This token was manually imported. Verify the contract address before transacting.</p>
            </div>
          </motion.div>
        )}

        {/* Token Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <div className="mx-auto mb-4">
            <CoinIcon symbol={token.symbol} size={80} fallbackColor={token.color} />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">{token.name}</h1>
          <p className="text-muted-foreground text-sm">{token.symbol}</p>
        </motion.div>

        {/* Price Card */}
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
          {marketData && (
            <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
              <span>H: {formatPrice(marketData.high24h)}</span>
              <span>L: {formatPrice(marketData.low24h)}</span>
            </div>
          )}
        </motion.div>

        {/* Price Chart with 5 timeframes */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="bg-card rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground">Price Chart</span>
            <div className="flex gap-1">
              {(["1H", "1D", "7D", "30D", "1Y"] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
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

        {/* Market Data */}
        {marketData && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }} className="bg-card rounded-2xl p-4 mb-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <BarChart3 size={16} className="text-primary" /> Market Data
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Market Cap", value: formatLargeNumber(marketData.marketCap) },
                { label: "24h Volume", value: formatLargeNumber(marketData.volume24h) },
                { label: "Circulating", value: marketData.circulatingSupply.toLocaleString("en-US", { maximumFractionDigits: 0 }) },
                { label: "Total Supply", value: marketData.totalSupply ? marketData.totalSupply.toLocaleString("en-US", { maximumFractionDigits: 0 }) : "∞" },
              ].map((item) => (
                <div key={item.label} className="bg-secondary/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Balance */}
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

        {/* Token Settings */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-4 mb-4">
          <div className="bg-card rounded-2xl divide-y divide-border">
            <button onClick={toggleHide} className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors text-left">
              {hidden ? <Eye size={16} className="text-muted-foreground" /> : <EyeOff size={16} className="text-muted-foreground" />}
              <span className="text-sm text-foreground">{hidden ? "Show Token" : "Hide Token"}</span>
            </button>
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
            transition={{ delay: 0.32 }}
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
