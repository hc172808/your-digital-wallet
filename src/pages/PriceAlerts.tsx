import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Bell, Trash2, Plus, BellOff, History } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import BottomNav from "@/components/wallet/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  type PriceAlert,
  type AlertLogEntry,
  getAlerts,
  addAlert,
  removeAlert,
  toggleAlert,
  getLog,
  clearLog,
} from "@/lib/price-alerts";
import { fetchPrices, formatPrice, type PriceData } from "@/lib/price-fetcher";

const SYMBOL_OPTIONS = [
  "BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "AVAX", "MATIC",
  "LINK", "UNI", "AAVE", "DOGE", "SHIB", "PEPE", "BONK", "WIF",
];

const PriceAlerts = () => {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [log, setLog] = useState<AlertLogEntry[]>([]);
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState("BTC");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [threshold, setThreshold] = useState("");

  const refresh = () => {
    setAlerts(getAlerts());
    setLog(getLog());
  };

  useEffect(() => {
    refresh();
    fetchPrices(SYMBOL_OPTIONS).then(setPrices);
  }, []);

  const handleAdd = () => {
    const t = parseFloat(threshold);
    if (!symbol || isNaN(t) || t <= 0) {
      toast.error("Enter a valid price threshold");
      return;
    }
    addAlert({ symbol: symbol.toUpperCase(), direction, threshold: t });
    toast.success(`Alert set: ${symbol} ${direction} ${formatPrice(t)}`);
    setThreshold("");
    setOpen(false);
    refresh();
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-display font-semibold">Price Alerts</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <Plus size={20} />
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Price Alert</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Token</label>
                  <Select value={symbol} onValueChange={setSymbol}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SYMBOL_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s} {prices[s] ? `· ${formatPrice(prices[s].usd)}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Direction</label>
                  <Select value={direction} onValueChange={(v) => setDirection(v as "above" | "below")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="above">Goes above</SelectItem>
                      <SelectItem value="below">Drops below</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Threshold (USD)</label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. 70000"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                  />
                </div>
                <Button onClick={handleAdd} className="w-full">Create Alert</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <h2 className="text-sm font-semibold text-muted-foreground mb-3">Active alerts</h2>
        {alerts.length === 0 ? (
          <div className="bg-card rounded-xl p-6 text-center text-muted-foreground text-sm">
            <Bell className="mx-auto mb-2 opacity-50" size={24} />
            No alerts yet. Tap + to create one.
          </div>
        ) : (
          <div className="space-y-2 mb-6">
            {alerts.map((a, i) => {
              const cur = prices[a.symbol]?.usd;
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-card rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="font-semibold">
                      {a.symbol}{" "}
                      <span className="text-muted-foreground font-normal text-sm">
                        {a.direction} {formatPrice(a.threshold)}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.triggeredAt
                        ? "Triggered"
                        : cur
                        ? `Now ${formatPrice(cur)}`
                        : a.active
                        ? "Watching…"
                        : "Paused"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { toggleAlert(a.id); refresh(); }}
                      className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
                      title={a.active ? "Pause" : "Resume"}
                    >
                      {a.active ? <Bell size={16} /> : <BellOff size={16} />}
                    </button>
                    <button
                      onClick={() => { removeAlert(a.id); refresh(); }}
                      className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-destructive"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <History size={14} /> History
          </h2>
          {log.length > 0 && (
            <button
              onClick={() => { clearLog(); refresh(); }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
        {log.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No triggers yet.</p>
        ) : (
          <div className="space-y-2">
            {log.map((e) => (
              <div key={e.id} className="bg-card rounded-xl p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">
                    {e.symbol} {e.direction} {formatPrice(e.threshold)}
                  </span>
                  <span className="text-success font-semibold">{formatPrice(e.price)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(e.triggeredAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default PriceAlerts;
