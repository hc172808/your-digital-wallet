import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Trash2, Save, Shield, Server, Globe, Hash, Coins } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  getNetworkConfig,
  saveNetworkConfig,
  isAdminSetup,
  setupAdmin,
  verifyAdmin,
  APP_VERSION,
  type NetworkConfig,
} from "@/lib/network-config";

const Admin = () => {
  const { toast } = useToast();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [isSetup, setIsSetup] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [config, setConfig] = useState<NetworkConfig>(getNetworkConfig());
  const [newRpc, setNewRpc] = useState("");

  useEffect(() => {
    setIsSetup(isAdminSetup());
  }, []);

  const handleLogin = async () => {
    if (!password.trim()) {
      toast({ title: "Enter password", variant: "destructive" });
      return;
    }
    if (!isSetup) {
      if (password.length < 6) {
        toast({ title: "Password must be at least 6 characters", variant: "destructive" });
        return;
      }
      if (password !== confirmPassword) {
        toast({ title: "Passwords don't match", variant: "destructive" });
        return;
      }
      await setupAdmin(password);
      setAuthenticated(true);
      toast({ title: "Admin account created" });
    } else {
      const valid = await verifyAdmin(password);
      if (valid) {
        setAuthenticated(true);
      } else {
        toast({ title: "Invalid password", variant: "destructive" });
      }
    }
  };

  const handleAddRpc = () => {
    const trimmed = newRpc.trim();
    if (!trimmed) return;
    try {
      new URL(trimmed);
    } catch {
      toast({ title: "Invalid URL", variant: "destructive" });
      return;
    }
    if (config.rpcUrls.includes(trimmed)) {
      toast({ title: "RPC already exists", variant: "destructive" });
      return;
    }
    setConfig({ ...config, rpcUrls: [...config.rpcUrls, trimmed] });
    setNewRpc("");
  };

  const handleRemoveRpc = (index: number) => {
    if (config.rpcUrls.length <= 1) {
      toast({ title: "Must keep at least one RPC", variant: "destructive" });
      return;
    }
    setConfig({ ...config, rpcUrls: config.rpcUrls.filter((_, i) => i !== index) });
  };

  const handleSave = () => {
    saveNetworkConfig(config);
    toast({ title: "Network config saved", description: "Changes will take effect on next connection." });
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-6"
        >
          <div className="text-center">
            <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
              <Shield size={28} className="text-primary-foreground" />
            </div>
            <h1 className="text-xl font-display font-bold text-foreground">Admin Access</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isSetup ? "Enter your admin password" : "Set up your admin password"}
            </p>
          </div>

          <div className="space-y-3">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary"
            />
            {!isSetup && (
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary"
              />
            )}
            <button
              onClick={handleLogin}
              className="w-full gradient-primary text-primary-foreground font-display font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
            >
              {isSetup ? "Login" : "Create Admin"}
            </button>
          </div>

          <Link to="/" className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to Wallet
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={20} />
            <span className="font-medium">Back</span>
          </Link>
          <span className="text-xs text-muted-foreground">v{APP_VERSION}</span>
        </div>

        <h1 className="text-xl font-display font-bold text-foreground mb-6">Network Admin</h1>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Network Info */}
          <div className="bg-card rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Globe size={16} className="text-primary" /> Network Details
            </h2>
            {[
              { label: "Network Name", key: "name" as const, icon: Globe },
              { label: "Symbol", key: "symbol" as const, icon: Coins },
              { label: "Chain ID", key: "chainId" as const, icon: Hash },
              { label: "Chain ID (Hex)", key: "chainIdHex" as const, icon: Hash },
              { label: "Decimals", key: "decimals" as const, icon: Hash },
              { label: "Block Explorer", key: "blockExplorer" as const, icon: Globe },
            ].map((field) => (
              <div key={field.key} className="space-y-1">
                <label className="text-xs text-muted-foreground">{field.label}</label>
                <input
                  value={String(config[field.key])}
                  onChange={(e) => {
                    const val = field.key === "chainId" || field.key === "decimals"
                      ? parseInt(e.target.value) || 0
                      : e.target.value;
                    setConfig({ ...config, [field.key]: val });
                  }}
                  className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            ))}
          </div>

          {/* RPC URLs */}
          <div className="bg-card rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Server size={16} className="text-primary" /> RPC Endpoints
            </h2>
            <p className="text-xs text-muted-foreground">Listed in priority order. First available endpoint is used.</p>

            {config.rpcUrls.map((url, i) => (
              <motion.div
                key={`${url}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-2"
              >
                <span className="text-xs text-muted-foreground w-5 shrink-0">#{i + 1}</span>
                <div className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground truncate">
                  {url}
                </div>
                <button
                  onClick={() => handleRemoveRpc(i)}
                  className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}

            <div className="flex gap-2">
              <input
                value={newRpc}
                onChange={(e) => setNewRpc(e.target.value)}
                placeholder="https://new-rpc-url.com"
                onKeyDown={(e) => e.key === "Enter" && handleAddRpc()}
                className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={handleAddRpc}
                className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground shrink-0"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            className="w-full gradient-primary text-primary-foreground font-display font-bold py-4 rounded-xl text-lg hover:opacity-90 transition-opacity glow-primary flex items-center justify-center gap-2"
          >
            <Save size={20} />
            Save Configuration
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Admin;
