import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, TrendingDown, ExternalLink, Copy, ArrowUpRight, ArrowDownLeft, ArrowDownUp, Clock, Coins, Hash, FileText } from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import BottomNav from "@/components/wallet/BottomNav";
import { getNetworkConfig } from "@/lib/network-config";
import { getCustomTokens } from "@/lib/custom-tokens";
import { useToast } from "@/hooks/use-toast";

interface TokenInfo {
  symbol: string;
  name: string;
  price: string;
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
  BTC: { symbol: "BTC", name: "Bitcoin", price: "$67,432.10", change: "+3.2%", up: true, amount: "0.2145", value: "$14,464.59", color: "from-amber-500 to-orange-500", decimals: 18, description: "Bitcoin is the first decentralized cryptocurrency. Nodes verify transactions through cryptography and record them in a public ledger called a blockchain." },
  ETH: { symbol: "ETH", name: "Ethereum", price: "$3,521.40", change: "+1.8%", up: true, amount: "1.8320", value: "$6,453.24", color: "from-blue-400 to-indigo-500", decimals: 18, description: "Ethereum is a decentralized platform that enables smart contracts and dApps to be built and run without downtime, fraud, or third-party interference." },
  SOL: { symbol: "SOL", name: "Solana", price: "$178.90", change: "-0.5%", up: false, amount: "12.50", value: "$2,236.25", color: "from-purple-500 to-fuchsia-500", decimals: 18, description: "Solana is a high-performance blockchain supporting builders around the world creating crypto apps that scale." },
  USDT: { symbol: "USDT", name: "Tether", price: "$1.00", change: "0.0%", up: true, amount: "1,367.72", value: "$1,367.72", color: "from-emerald-400 to-green-500", decimals: 6, description: "Tether (USDT) is a stablecoin pegged to the US Dollar. It provides stability in the volatile cryptocurrency market." },
  GYDS: { symbol: "GYDS", name: "GYDS Network", price: "$0.15", change: "+12.4%", up: true, amount: "10,000", value: "$1,500.00", color: "from-cyan-400 to-teal-500", decimals: 18, description: "GYDS is the native token of the GYDS Network (Chain ID: 13370). It powers transactions, gas fees, and governance on the network." },
  GYD: { symbol: "GYD", name: "GYD Stablecoin", price: "$1.00", change: "0.0%", up: true, amount: "5,000", value: "$5,000.00", color: "from-sky-400 to-cyan-500", decimals: 18, description: "GYD is a stablecoin on the GYDS Network pegged to 1 USD. Used for payments, transfers, and DeFi applications." },
};

const TokenDetail = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const config = getNetworkConfig();
  const { toast } = useToast();

  // Find token info
  let token: TokenInfo | null = null;

  if (symbol && DEFAULT_TOKENS[symbol.toUpperCase()]) {
    token = DEFAULT_TOKENS[symbol.toUpperCase()];
  } else if (symbol) {
    const custom = getCustomTokens().find((t) => t.symbol.toUpperCase() === symbol.toUpperCase());
    if (custom) {
      token = {
        symbol: custom.symbol,
        name: custom.name,
        price: "—",
        change: "0.0%",
        up: true,
        amount: "0",
        value: "—",
        color: custom.color,
        contractAddress: custom.contractAddress,
        decimals: custom.decimals,
        description: `${custom.name} (${custom.symbol}) is a custom imported ERC-20 token on the GYDS Network.`,
      };
    }
  }

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
        <Link
          to="/"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card rounded-2xl p-5 mb-4"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Price</span>
            <div className="flex items-center gap-1">
              {token.up ? (
                <TrendingUp size={14} className="text-[hsl(var(--success))]" />
              ) : (
                <TrendingDown size={14} className="text-destructive" />
              )}
              <span className={`text-sm font-medium ${token.up ? "text-[hsl(var(--success))]" : "text-destructive"}`}>
                {token.change}
              </span>
            </div>
          </div>
          <p className="text-3xl font-display font-bold text-foreground">{token.price}</p>
        </motion.div>

        {/* Balance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl p-5 mb-4"
        >
          <span className="text-sm text-muted-foreground">Your Balance</span>
          <p className="text-2xl font-display font-bold text-foreground mt-1">{token.amount} {token.symbol}</p>
          <p className="text-sm text-muted-foreground">{token.value}</p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          {[
            { icon: ArrowUpRight, label: "Send", path: "/send" },
            { icon: ArrowDownLeft, label: "Receive", path: "/receive" },
            { icon: ArrowDownUp, label: "Swap", path: "/swap" },
          ].map((action) => (
            <Link
              key={action.label}
              to={action.path}
              className="flex flex-col items-center gap-2 bg-card rounded-2xl py-4 hover:bg-secondary/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
                <action.icon size={18} className="text-primary-foreground" />
              </div>
              <span className="text-xs font-medium text-foreground">{action.label}</span>
            </Link>
          ))}
        </motion.div>

        {/* About */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-4"
        >
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">About</h2>
          <div className="bg-card rounded-2xl p-4">
            <p className="text-sm text-foreground leading-relaxed">{token.description}</p>
          </div>
        </motion.div>

        {/* Token Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">Details</h2>
          <div className="bg-card rounded-2xl divide-y divide-border">
            {details.map((item) => (
              <button
                key={item.label}
                onClick={() => copyToClipboard(item.value)}
                className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors text-left"
              >
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
