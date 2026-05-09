import { useEffect, useState } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

const LAST_UPDATE_KEY = "gyds_sw_last_update";

export function recordSwUpdate() {
  try {
    localStorage.setItem(LAST_UPDATE_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

const formatRelative = (ts: number): string => {
  if (!ts) return "never";
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const PwaStatusBanner = () => {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [hasSw, setHasSw] = useState(false);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    setLastUpdate(parseInt(localStorage.getItem(LAST_UPDATE_KEY) || "0", 10));

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        setHasSw(regs.length > 0);
      });

      const onCtrlChange = () => {
        recordSwUpdate();
        setLastUpdate(Date.now());
        setHasSw(true);
      };
      navigator.serviceWorker.addEventListener("controllerchange", onCtrlChange);

      return () => {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
        navigator.serviceWorker.removeEventListener("controllerchange", onCtrlChange);
      };
    }

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Hide entirely when fully online + no SW (nothing useful to surface)
  if (online && !hasSw) return null;

  return (
    <div
      className={`mb-4 rounded-xl border px-3 py-2 flex items-center gap-2 text-xs ${
        online
          ? "bg-card border-border text-muted-foreground"
          : "bg-destructive/10 border-destructive/30 text-destructive"
      }`}
      role="status"
      aria-live="polite"
    >
      {online ? <Wifi size={14} /> : <WifiOff size={14} />}
      <span className="font-semibold">
        {online ? "Online" : "Offline"}
      </span>
      {hasSw && (
        <span className="flex items-center gap-1 ml-auto">
          <RefreshCw size={12} />
          <span>SW updated {formatRelative(lastUpdate)}</span>
        </span>
      )}
      {!online && (
        <span className="ml-auto">Cached app shell available</span>
      )}
    </div>
  );
};

export default PwaStatusBanner;
