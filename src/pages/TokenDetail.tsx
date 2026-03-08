import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, TrendingDown, ExternalLink, Copy, ArrowUpRight, ArrowDownLeft, ArrowDownUp, Coins, Hash, FileText, Clock } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import BottomNav from "@/components/wallet/BottomNav";
import { getNetworkConfig } from "@/lib/network-config";
import { getCustomTokens } from "@/lib/custom-tokens";
import { useToast } from "@/hooks/use-toast";

interface TokenInfo {
  symbol: string;
  name: string;
  price: string;
  priceNum: number;
  change: string;
  up: boolean;
  amount: string;
  value: string;
  color: string;
  contractAddress?: string;
  decimals: number;
  description: string;
}

const DEFAULT_TOKENS: Record<string, TokenInfo> = {
  BTC: { symbol: "BTC", name: "Bitcoin", price: "$67,432.10", priceNum: 67432.1, change: "+3.2%", up: true, amount: "0.2145", value: "$14,464.59", color: "from-amber-500 to-orange-500", decimals: 18, description: "Bitcoin is the first decentralized cryptocurrency. Nodes verify transactions through cryptography and record them in a public ledger called a blockchain." },
  ETH: { symbol: "ETH", name: "Ethereum", price: "$3,521.40", priceNum: 3521.4, change: "+1.8%", up: true, amount: "1.8320", value: "$6,453.24", color: "from-blue-400 to-indigo-500", decimals: 18, description: "Ethereum is a decentralized platform that enables smart contracts and dApps to be built and run without downtime, fraud, or third-party interference." },
  SOL: { symbol: "SOL", name: "Solana", price: "$178.90", priceNum: 178.9, change: "-0.5%", up: false, amount: "12.50", value: "$2,236.25", color: "from-purple-500 to-fuchsia-500", decimals: 18, description: "Solana is a high-performance blockchain supporting builders around the world creating crypto apps that scale." },
  USDT: { symbol: "USDT", name: "Tether", price: "$1.00", priceNum: 1.0, change: "0.0%", up: true, amount: "1,367.72", value: "$1,367.72", color: "from-emerald-400 to-green-500", decimals: 6, description: "Tether (USDT) is a stablecoin pegged to the US Dollar. It provides stability in the volatile cryptocurrency market." },
  GYDS: { symbol: "GYDS", name: "GYDS Network", price: "$0.15", priceNum: 0.15, change: "+12.4%", up: true, amount: "10,000", value: "$1,500.00", color: "from-cyan-400 to-teal-500", decimals: 18, description: "GYDS is the native token of the GYDS Network (Chain ID: 13370). It powers transactions, gas fees, and governance on the network." },
  GYD: { symbol: "GYD", name: "GYD Stablecoin", price: "$1.00", priceNum: 1.0, change: "0.0%", up: true, amount: "5,000", value: "$5,000.00", color: "from-sky-400 to-cyan-500", decimals: 18, description: "GYD is a stablecoin on the GYDS Network pegged to 1 USD. Used for payments, transfers, and DeFi applications." },
};

type TimeRange = "7D" | "30D" | "1Y";

// Generate mock price history data
const generatePriceData = (basePrice: number, range: TimeRange, volatile: boolean) => {
  const points = range === "7D" ? 7 : range === "30D" ? 30 : 365;
  const volatility = volatile ? 0.05 : 0.002;
  const data = [];
  let price = basePrice * (1 - volatility * points * 0.3);

  for (let i = 0; i < points; i++) {
    const change = (Math.random() - 0.45) * basePrice * volatility;
    price = Math.max(price + change, basePrice * 0.5);
    const date = new Date();
    date.setDate(date.getDate() - (points - i));
    data.push({
      date: range === "1Y"
        ? date.toLocaleDateString("en", { month: "short" })
        : date.toLocaleDateString("en", { month: "short", day: "numeric" }),
      price: parseFloat(price.toFixed(price < 1 ? 4 : 2)),
    });
  }
  return data;
};

// Mock transaction history per token
const MOCK_TX: Record<string, Array<{ type: "send" | "receive" | "swap"; amount: string; date: string; address: string; status: "confirmed" | "pending" }>> = {
  BTC: [
    { type: "send", amount: "-0.015 BTC", date: "2h ago", address: "0x8a2...f4c1", status: "confirmed" },
    { type: "receive", amount: "+0.05 BTC", date: "1d ago", address: "0x3b1...a8e2", status: "confirmed" },
    { type: "receive", amount: "+0.1 BTC", date: "5d ago", address: "0xf2a...c3d4", status: "confirmed" },
  ],
  ETH: [
    { type: "receive", amount: "+0.5 ETH", date: "5h ago", address: "0x7c9...b2a1", status: "confirmed" },
    { type: "send", amount: "-0.2 ETH", date: "2d ago", address: "0x4e5...d6f7", status: "confirmed" },
    { type: "swap", amount: "1.0 ETH → 3,500 USDT", date: "4d ago", address: "Swap", status: "confirmed" },
  ],
  SOL: [
    { type: "swap", amount: "2.0 SOL → 357 USDT", date: "1d ago", address: "Swap", status: "confirmed" },
    { type: "receive", amount: "+5.0 SOL", date: "3d ago", address: "0xa1b...2c3d", status: "confirmed" },
  ],
  USDT: [
    { type: "receive", amount: "+500 USDT", date: "2d ago", address: "0x9f8...e7d6", status: "confirmed" },
    { type: "send", amount: "-200 USDT", date: "5d ago", address: "0x1a2...b3c4", status: "confirmed" },
  ],
  GYDS: [
    { type: "receive", amount: "+5,000 GYDS", date: "1d ago", address: "0xabc...def0", status: "confirmed" },
    { type: "send", amount: "-1,000 GYDS", date: "3d ago", address: "0x123...4567", status: "confirmed" },
    { type: "receive", amount: "+3,000 GYDS", date: "5d ago", address: "0x789...abc0", status: "confirmed" },
    { type: "swap", amount: "2,000 GYDS → 300 GYD", date: "7d ago", address: "Swap", status: "confirmed" },
  ],
  GYD: [
    { type: "receive", amount: "+2,000 GYD", date: "2d ago", address: "0xdef...1234", status: "confirmed" },
    { type: "send", amount: "-500 GYD", date: "4d ago", address: "0x567...89ab", status: "confirmed" },
    { type: "swap", amount: "1,000 GYD → 6,666 GYDS", date: "6d ago", address: "Swap", status: "confirmed" },
  ],
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

  let token: TokenInfo | null = null;

  if (symbol && DEFAULT_TOKENS[symbol.toUpperCase()]) {
    token = DEFAULT_TOKENS[symbol.toUpperCase()];
  } else if (symbol) {
    const custom = getCustomTokens().find((t) => t.symbol.toUpperCase() === symbol.toUpperCase());
    if (custom) {
      token = {
        symbol: custom.symbol, name: custom.name, price: "—", priceNum: 0, change: "0.0%", up: true,
        amount: "0", value: "—", color: custom.color, contractAddress: custom.contractAddress,
        decimals: custom.decimals,
        description: `${custom.name} (${custom.symbol}) is a custom imported ERC-20 token on the GYDS Network.`,
      };
    }
  }

  const isStable = token?.symbol === "USDT" || token?.symbol === "GYD";
  const priceData = useMemo(
    () => token ? generatePriceData(token.priceNum, timeRange, !isStable) : [],
    [token?.priceNum, timeRange, isStable]
  );

  const transactions = token ? (MOCK_TX[token.symbol.toUpperCase()] || []) : [];

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

        {/* Price Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Price</span>
            <div className="flex items-center gap-1">
              {token.up ? <TrendingUp size={14} className="text-[hsl(var(--success))]" /> : <TrendingDown size={14} className="text-destructive" />}
              <span className={`text-sm font-medium ${token.up ? "text-[hsl(var(--success))]" : "text-destructive"}`}>{token.change}</span>
            </div>
          </div>
          <p className="text-3xl font-display font-bold text-foreground">{token.price}</p>
        </motion.div>

        {/* Price Chart */}
        {token.priceNum > 0 && (
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
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={priceData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
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
            </div>
          </motion.div>
        )}

        {/* Balance */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl p-5 mb-4">
          <span className="text-sm text-muted-foreground">Your Balance</span>
          <p className="text-2xl font-display font-bold text-foreground mt-1">{token.amount} {token.symbol}</p>
          <p className="text-sm text-muted-foreground">{token.value}</p>
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

        {/* Transaction History */}
        {transactions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">Transaction History</h2>
            <div className="space-y-2">
              {transactions.map((tx, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                  className="flex items-center gap-3 bg-card rounded-xl p-4"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tx.type === "send" ? "bg-destructive/10" : tx.type === "receive" ? "bg-[hsl(var(--success))]/10" : "bg-primary/10"
                  }`}>
                    {tx.type === "send" ? (
                      <ArrowUpRight size={18} className="text-destructive" />
                    ) : tx.type === "receive" ? (
                      <ArrowDownLeft size={18} className="text-[hsl(var(--success))]" />
                    ) : (
                      <ArrowDownUp size={18} className="text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground capitalize">{tx.type}</p>
                      <p className={`text-sm font-medium ${
                        tx.type === "send" ? "text-destructive" : tx.type === "receive" ? "text-[hsl(var(--success))]" : "text-foreground"
                      }`}>
                        {tx.amount}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{tx.address}</p>
                      <div className="flex items-center gap-1">
                        <Clock size={10} className="text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{tx.date}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* About */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">About</h2>
          <div className="bg-card rounded-2xl p-4">
            <p className="text-sm text-foreground leading-relaxed">{token.description}</p>
          </div>
        </motion.div>

        {/* Token Details */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
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
            transition={{ delay: 0.3 }}
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
