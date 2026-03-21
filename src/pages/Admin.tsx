import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Trash2, Save, Shield, Server, Globe, Hash, Coins, Users, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  getNetworkConfig,
  saveNetworkConfig,
  isAdminSetup,
  setupAdmin,
  verifyAdmin,
  validateRpcUrl,
  APP_VERSION,
  type NetworkConfig,
} from "@/lib/network-config";

// Multi-admin storage
const ADMINS_KEY = "gyds_admin_list";

interface AdminUser {
  id: string;
  name: string;
  createdAt: number;
}

const getAdminList = (): AdminUser[] => {
  try {
    const stored = localStorage.getItem(ADMINS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
};

const saveAdminList = (admins: AdminUser[]) => {
  localStorage.setItem(ADMINS_KEY, JSON.stringify(admins));
};

const Admin = () => {
  const { toast } = useToast();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [isSetup, setIsSetup] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [config, setConfig] = useState<NetworkConfig>(getNetworkConfig());
  const [newRpc, setNewRpc] = useState("");
  const [adminList, setAdminList] = useState<AdminUser[]>([]);
  const [newAdminName, setNewAdminName] = useState("");
  const [activeTab, setActiveTab] = useState<"network" | "admins">("network");

  useEffect(() => {
    setIsSetup(isAdminSetup());
    setAdminList(getAdminList());
  }, []);

  const handleLogin = async () => {
    if (!password.trim()) {
      toast({ title: "Enter password", variant: "destructive" });
      return;
    }
    if (!isSetup) {
      if (password.length < 8) {
        toast({ title: "Password must be at least 8 characters", variant: "destructive" });
        return;
      }
      if (password !== confirmPassword) {
        toast({ title: "Passwords don't match", variant: "destructive" });
        return;
      }
      await setupAdmin(password);
      // Initialize admin list with primary admin
      const initial: AdminUser[] = [{ id: "primary", name: "Primary Admin", createdAt: Date.now() }];
      saveAdminList(initial);
      setAdminList(initial);
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
    const name = newAdminName.trim();
    if (!name) return;
    if (name.length > 30) { toast({ title: "Name too long", variant: "destructive" }); return; }
    const newAdmin: AdminUser = { id: `admin-${Date.now()}`, name, createdAt: Date.now() };
    const updated = [...adminList, newAdmin];
    saveAdminList(updated);
    setAdminList(updated);
    setNewAdminName("");
    toast({ title: `${name} added as admin` });
  };

  const handleRemoveAdmin = (id: string) => {
    if (id === "primary") { toast({ title: "Cannot remove primary admin", variant: "destructive" }); return; }
    const updated = adminList.filter((a) => a.id !== id);
    saveAdminList(updated);
    setAdminList(updated);
    toast({ title: "Admin removed" });
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-6">
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
            <input type="password" placeholder="Password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary" />
            {!isSetup && (
              <input type="password" placeholder="Confirm Password" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary" />
            )}
            <button onClick={handleLogin}
              className="w-full gradient-primary text-primary-foreground font-display font-bold py-3 rounded-xl hover:opacity-90 transition-opacity">
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

        <h1 className="text-xl font-display font-bold text-foreground mb-4">Admin Panel</h1>

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
                  <input value={String(config[field.key])}
                    onChange={(e) => {
                      const val = field.key === "chainId" || field.key === "decimals" ? parseInt(e.target.value) || 0 : e.target.value;
                      setConfig({ ...config, [field.key]: val });
                    }}
                    className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary" />
                </div>
              ))}
            </div>

            {/* RPC URLs */}
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
                <Users size={16} className="text-primary" /> Admin Users
              </h2>
              <p className="text-xs text-muted-foreground">Manage who can access the admin panel and modify network settings.</p>

              {adminList.map((admin) => (
                <div key={admin.id} className="flex items-center gap-3 bg-secondary/50 rounded-lg px-3 py-3">
                  <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                    {admin.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{admin.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {admin.id === "primary" ? "Primary Admin" : `Added ${new Date(admin.createdAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  {admin.id !== "primary" && (
                    <button onClick={() => handleRemoveAdmin(admin.id)}
                      className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}

              <div className="flex gap-2 pt-2">
                <input value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} placeholder="Admin name"
                  onKeyDown={(e) => e.key === "Enter" && handleAddAdmin()}
                  className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary" />
                <button onClick={handleAddAdmin} className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground shrink-0">
                  <UserPlus size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Admin;
