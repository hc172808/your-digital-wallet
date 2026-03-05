import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { Link } from "react-router-dom";
import BottomNav from "@/components/wallet/BottomNav";

const TOKENS = ["BTC", "ETH", "SOL", "USDT"];

const ADDRESSES: Record<string, string> = {
  BTC: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  ETH: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
  SOL: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV",
  USDT: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
};

const Receive = () => {
  const [token, setToken] = useState("BTC");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(ADDRESSES[token]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/" className="w-10 h-10 rounded-full bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-display font-bold text-foreground">Receive Crypto</h1>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Token selector */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Select Token</label>
            <div className="flex gap-2">
              {TOKENS.map((t) => (
                <button
                  key={t}
                  onClick={() => setToken(t)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    token === t ? "gradient-primary text-primary-foreground glow-primary" : "bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* QR placeholder */}
          <div className="flex justify-center">
            <div className="w-48 h-48 bg-foreground rounded-2xl flex items-center justify-center">
              <div className="w-40 h-40 bg-background rounded-xl flex items-center justify-center">
                <span className="text-4xl font-display font-bold text-gradient">{token}</span>
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Your {token} Address</label>
            <div className="bg-card rounded-xl p-4 flex items-center gap-3">
              <p className="flex-1 text-sm text-foreground font-mono break-all">{ADDRESSES[token]}</p>
              <button
                onClick={handleCopy}
                className="text-muted-foreground hover:text-primary transition-colors shrink-0"
              >
                {copied ? <Check size={20} className="text-success" /> : <Copy size={20} />}
              </button>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Only send <span className="text-primary font-semibold">{token}</span> to this address. Sending other tokens may result in permanent loss.
          </p>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Receive;
