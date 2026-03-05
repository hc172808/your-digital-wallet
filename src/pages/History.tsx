import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownLeft, Repeat, Filter } from "lucide-react";
import BottomNav from "@/components/wallet/BottomNav";

const HISTORY = [
  { type: "sent", label: "Sent BTC", detail: "To 0x4f2...8a1c", amount: "-0.015 BTC", usd: "-$1,011.48", date: "Mar 4, 2026", time: "2:34 PM" },
  { type: "received", label: "Received ETH", detail: "From 0x8b3...2e7d", amount: "+0.5 ETH", usd: "+$1,760.70", date: "Mar 4, 2026", time: "9:15 AM" },
  { type: "swap", label: "Swap SOL → USDT", detail: "Via DEX", amount: "2.0 SOL", usd: "$357.80", date: "Mar 3, 2026", time: "6:22 PM" },
  { type: "received", label: "Received USDT", detail: "From 0xa1c...9f3b", amount: "+500 USDT", usd: "+$500.00", date: "Mar 2, 2026", time: "11:00 AM" },
  { type: "sent", label: "Sent ETH", detail: "To 0x7d1...3c8e", amount: "-0.25 ETH", usd: "-$880.35", date: "Mar 1, 2026", time: "3:45 PM" },
  { type: "received", label: "Received BTC", detail: "From 0xf2a...1b4d", amount: "+0.05 BTC", usd: "+$3,371.60", date: "Feb 28, 2026", time: "8:30 AM" },
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

const History = () => {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-display font-bold text-foreground">Transaction History</h1>
          <button className="w-10 h-10 rounded-full bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Filter size={18} />
          </button>
        </div>

        <div className="space-y-2">
          {HISTORY.map((tx, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              className="flex items-center gap-3 p-4 bg-card rounded-xl hover:bg-secondary/50 transition-colors cursor-pointer"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorMap[tx.type as keyof typeof colorMap]}`}>
                {iconMap[tx.type as keyof typeof iconMap]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{tx.label}</p>
                <p className="text-xs text-muted-foreground">{tx.detail} · {tx.time}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${tx.type === "received" ? "text-success" : tx.type === "sent" ? "text-destructive" : "text-foreground"}`}>
                  {tx.amount}
                </p>
                <p className="text-xs text-muted-foreground">{tx.date}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default History;
