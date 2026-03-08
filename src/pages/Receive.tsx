import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { Link } from "react-router-dom";
import BottomNav from "@/components/wallet/BottomNav";
import { getWalletAddress } from "@/lib/wallet-core";

const Receive = () => {
  const [copied, setCopied] = useState(false);
  const walletAddress = getWalletAddress() || "";

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress);
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
          {/* QR placeholder */}
          <div className="flex justify-center">
            <div className="w-48 h-48 bg-foreground rounded-2xl flex items-center justify-center">
              <div className="w-40 h-40 bg-background rounded-xl flex items-center justify-center">
                <span className="text-3xl font-display font-bold text-gradient">GYDS</span>
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Your Wallet Address</label>
            <div className="bg-card rounded-xl p-4 flex items-center gap-3">
              <p className="flex-1 text-sm text-foreground font-mono break-all">{walletAddress}</p>
              <button onClick={handleCopy} className="text-muted-foreground hover:text-primary transition-colors shrink-0">
                {copied ? <Check size={20} className="text-success" /> : <Copy size={20} />}
              </button>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Send <span className="text-primary font-semibold">GYDS</span>, <span className="text-primary font-semibold">GYD</span>, or any ERC-20 token on GYDS Network to this address.
          </p>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Receive;
