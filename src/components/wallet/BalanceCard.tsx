import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownLeft, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

const BalanceCard = () => {
  const [visible, setVisible] = useState(true);

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
          {visible ? "$24,521.80" : "••••••"}
        </h1>
        <p className="text-sm text-primary-foreground/70 mb-6">
          {visible ? "+$1,240.50 (5.32%)" : "••••"}{" "}
          <span className="text-primary-foreground/50">today</span>
        </p>

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
