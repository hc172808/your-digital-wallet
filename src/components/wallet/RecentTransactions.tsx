import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownLeft, Repeat } from "lucide-react";

const TRANSACTIONS = [
  { type: "sent", label: "Sent BTC", to: "0x4f2...8a1c", amount: "-0.015 BTC", usd: "-$1,011.48", time: "2h ago" },
  { type: "received", label: "Received ETH", from: "0x8b3...2e7d", amount: "+0.5 ETH", usd: "+$1,760.70", time: "5h ago" },
  { type: "swap", label: "Swap SOL → USDT", from: "", amount: "2.0 SOL", usd: "$357.80", time: "1d ago" },
  { type: "received", label: "Received USDT", from: "0xa1c...9f3b", amount: "+500 USDT", usd: "+$500.00", time: "2d ago" },
];

const iconMap = {
  sent: <ArrowUpRight size={16} />,
  received: <ArrowDownLeft size={16} />,
  swap: <Repeat size={16} />,
};

const colorMap = {
  sent: "bg-destructive/20 text-destructive",
  received: "bg-success/20 text-success",
  swap: "gradient-purple text-foreground",
};

const RecentTransactions = () => {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-display font-semibold text-foreground">Recent Activity</h2>
        <a href="/history" className="text-sm text-muted-foreground hover:text-primary transition-colors">View All</a>
      </div>
      <div className="space-y-2">
        {TRANSACTIONS.map((tx, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.08, duration: 0.3 }}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-card transition-colors cursor-pointer"
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${colorMap[tx.type as keyof typeof colorMap]}`}>
              {iconMap[tx.type as keyof typeof iconMap]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{tx.label}</p>
              <p className="text-xs text-muted-foreground">{tx.time}</p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-semibold ${tx.type === "received" ? "text-success" : tx.type === "sent" ? "text-destructive" : "text-foreground"}`}>
                {tx.amount}
              </p>
              <p className="text-xs text-muted-foreground">{tx.usd}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default RecentTransactions;
