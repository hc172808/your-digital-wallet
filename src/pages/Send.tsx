import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, QrCode } from "lucide-react";
import { Link } from "react-router-dom";
import BottomNav from "@/components/wallet/BottomNav";

const TOKENS = ["BTC", "ETH", "SOL", "USDT"];

const Send = () => {
  const [token, setToken] = useState("BTC");
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/" className="w-10 h-10 rounded-full bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-display font-bold text-foreground">Send Crypto</h1>
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

          {/* Amount */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Amount</label>
            <div className="bg-card rounded-xl p-4">
              <input
                type="text"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-transparent text-3xl font-display font-bold text-foreground outline-none placeholder:text-muted-foreground/30"
              />
              <p className="text-sm text-muted-foreground mt-1">≈ $0.00 USD</p>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Recipient Address</label>
            <div className="bg-card rounded-xl p-4 flex items-center gap-3">
              <input
                type="text"
                placeholder="Enter wallet address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
              />
              <button className="text-muted-foreground hover:text-primary transition-colors">
                <QrCode size={20} />
              </button>
            </div>
          </div>

          {/* Send button */}
          <button className="w-full gradient-primary text-primary-foreground font-semibold py-4 rounded-xl glow-primary hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-lg">
            <ArrowUpRight size={20} />
            Send {token}
          </button>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Send;
