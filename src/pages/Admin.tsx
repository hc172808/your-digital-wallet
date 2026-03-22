import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Trash2, Save, Shield, Server, Globe, Hash, Coins, Users, UserPlus, AlertTriangle } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  getNetworkConfig,
  saveNetworkConfig,
  validateRpcUrl,
  APP_VERSION,
  type NetworkConfig,
} from "@/lib/network-config";
import { getWalletAddress } from "@/lib/wallet-core";
import { isAdminWallet, getAdminWallets, addAdminWallet, removeAdminWallet, isEnvAdmin } from "@/lib/admin-auth";

const Admin = () => {
  const { toast } = useToast();
  const walletAddress = getWalletAddress();
  const isAdmin = isAdminWallet(walletAddress);

  const [config, setConfig] = useState<NetworkConfig>(getNetworkConfig());
  const [newRpc, setNewRpc] = useState("");
  const [newAdminAddress, setNewAdminAddress] = useState("");
  const [activeTab, setActiveTab] = useState<"network" | "admins">("network");
  const [adminWallets, setAdminWallets] = useState<string[]>([]);

  useEffect(() => {
    setAdminWallets(getAdminWallets());
  }, []);

  // Block non-admin users
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleAddRpc = () => {
    const trimmed = newRpc.trim();
    if (!trimmed) return;
    if (!validateRpcUrl(trimmed)) {
      toast({ title: "Invalid URL format", variant: "destructive" });
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

  const handleAddAdmin = () => {
    const addr = newAdminAddress.trim();
    if (!addr) return;
    if (!addr.startsWith("0x") || addr.length !== 42) {
      toast({ title: "Invalid wallet address", description: "Must be a valid 0x... address (42 chars)", variant: "destructive" });
      return;
    }
    const success = addAdminWallet(addr);
    if (success) {
      setAdminWallets(getAdminWallets());
      setNewAdminAddress("");
      toast({ title: "Admin added", description: `${addr.slice(0, 6)}...${addr.slice(-4)}` });
    } else {
      toast({ title: "Already an admin or invalid address", variant: "destructive" });
    }
  };

  const handleRemoveAdmin = (addr: string) => {
    if (isEnvAdmin(addr)) {
      toast({ title: "Cannot remove env-defined admin", description: "This admin is set in the .env file", variant: "destructive" });
      return;
    }
    removeAdminWallet(addr);
    setAdminWallets(getAdminWallets());
    toast({ title: "Admin removed" });
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <Link to="/settings" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={20} />
            <span className="font-medium">Back</span>
          </Link>
          <span className="text-xs text-muted-foreground">v{APP_VERSION}</span>
        </div>

        <h1 className="text-xl font-display font-bold text-foreground mb-2">Admin Panel</h1>
        <p className="text-xs text-muted-foreground mb-4">
          Logged in as: {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: "network" as const, label: "Network", icon: Globe },
            { key: "admins" as const, label: "Admins", icon: Users },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.key ? "gradient-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
              }`}>
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "network" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="bg-card rounded-xl p-4 space-y-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Globe size={16} className="text-primary" /> Network Details
              </h2>
              {[
                { label: "Network Name", key: "name" as const },
                { label: "Symbol", key: "symbol" as const },
                { label: "Chain ID", key: "chainId" as const },
                { label: "Chain ID (Hex)", key: "chainIdHex" as const },
                { label: "Decimals", key: "decimals" as const },
                { label: "Block Explorer", key: "blockExplorer" as const },
              ].map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="text-xs text-muted-foreground">{field.label}</label>
                  <input value={String(config[field.key])}
                    onChange={(e) => {
                      const val = field.key === "chainId" || field.key === "decimals" ? parseInt(e.target.value) || 0 : e.target.value;
                      setConfig({ ...config, [field.key]: val });
                    }}
                    className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary" />
                </div>
              ))}
            </div>

            <div className="bg-card rounded-xl p-4 space-y-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Server size={16} className="text-primary" /> RPC Endpoints
              </h2>
              <p className="text-xs text-muted-foreground">Backup failover order — reads the indexer, next available is used if one goes down.</p>

              {config.rpcUrls.map((url, i) => (
                <motion.div key={`${url}-${i}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-5 shrink-0">#{i + 1}</span>
                  <div className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground truncate">{url}</div>
                  <button onClick={() => handleRemoveRpc(i)}
                    className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors shrink-0">
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))}

              <div className="flex gap-2">
                <input value={newRpc} onChange={(e) => setNewRpc(e.target.value)} placeholder="https://new-rpc-url.com"
                  onKeyDown={(e) => e.key === "Enter" && handleAddRpc()}
                  className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary" />
                <button onClick={handleAddRpc} className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground shrink-0">
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <button onClick={handleSave}
              className="w-full gradient-primary text-primary-foreground font-display font-bold py-4 rounded-xl text-lg hover:opacity-90 transition-opacity glow-primary flex items-center justify-center gap-2">
              <Save size={20} /> Save Configuration
            </button>
          </motion.div>
        )}

        {activeTab === "admins" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="bg-card rounded-xl p-4 space-y-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users size={16} className="text-primary" /> Admin Wallets
              </h2>
              <p className="text-xs text-muted-foreground">
                Only these wallet addresses can access the admin panel. Env-defined admins cannot be removed.
              </p>

              {adminWallets.map((addr) => (
                <div key={addr} className="flex items-center gap-3 bg-secondary/50 rounded-lg px-3 py-3">
                  <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                    {addr.slice(2, 4).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-foreground truncate">{addr}</p>
                    <p className="text-xs text-muted-foreground">
                      {isEnvAdmin(addr) ? "🔒 Env-defined" : "Runtime admin"}
                      {addr.toLowerCase() === walletAddress?.toLowerCase() ? " (you)" : ""}
                    </p>
                  </div>
                  {!isEnvAdmin(addr) && (
                    <button onClick={() => handleRemoveAdmin(addr)}
                      className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}

              <div className="flex gap-2 pt-2">
                <input value={newAdminAddress} onChange={(e) => setNewAdminAddress(e.target.value)} placeholder="0x... wallet address"
                  onKeyDown={(e) => e.key === "Enter" && handleAddAdmin()}
                  className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary" />
                <button onClick={handleAddAdmin} className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground shrink-0">
                  <UserPlus size={18} />
                </button>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10 mt-2">
                <AlertTriangle size={14} className="text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  To add permanent admin wallets, set <code className="text-primary">VITE_ADMIN_WALLETS</code> in your .env file (comma-separated).
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Admin;
