import { useState, useEffect } from "react";
import { Link2, Trash2, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  isWcUri,
  pair,
  listSessions,
  disconnectSession,
  saveSession,
  getReconnectLog,
  type WcSession,
  type WcReconnectEvent,
} from "@/lib/walletconnect-v2";
import { useWcAutoReconnect } from "@/hooks/use-wc-auto-reconnect";

const WalletConnectCard = () => {
  const [uri, setUri] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessions, setSessions] = useState<WcSession[]>([]);
  const [log, setLog] = useState<WcReconnectEvent[]>([]);
  const { toast } = useToast();
  const restored = useWcAutoReconnect();

  useEffect(() => {
    setSessions(listSessions());
    setLog(getReconnectLog());
    if (restored.length > 0) {
      toast({
        title: `Reconnected ${restored.length} WalletConnect session${restored.length === 1 ? "" : "s"}`,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored.length]);

  const handlePair = async () => {
    if (!isWcUri(uri.trim())) {
      toast({ title: "Invalid WalletConnect URI", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const parsed = await pair(uri.trim());
      saveSession({
        topic: parsed.topic,
        peerName: "Pending dApp",
      });
      setSessions(listSessions());
      setUri("");
      toast({
        title: "Pairing started",
        description: "Session persisted — will auto-reconnect after reload.",
      });
    } catch (err: any) {
      toast({ title: "Pairing failed", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = (topic: string) => {
    disconnectSession(topic);
    setSessions(listSessions());
  };

  return (
    <div className="bg-card rounded-2xl p-4 border border-border">
      <div className="flex items-center gap-2 mb-3">
        <Link2 size={18} className="text-primary" />
        <h3 className="font-display font-semibold text-foreground">WalletConnect v2</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Paste a <code className="text-foreground">wc:</code> URI from any dApp to connect.
      </p>

      <div className="flex gap-2 mb-3">
        <input
          value={uri}
          onChange={(e) => setUri(e.target.value)}
          placeholder="wc:topic@2?relay-protocol=..."
          className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/40 border border-border focus:border-primary"
        />
        <button
          onClick={handlePair}
          disabled={busy || !uri}
          className="gradient-primary text-primary-foreground px-4 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {busy ? "..." : "Pair"}
        </button>
      </div>

      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-lg p-2 mb-3">
        <AlertCircle size={14} className="mt-0.5 shrink-0" />
        <span>
          Scaffold only. Full Sign-API integration arrives once
          <code className="text-foreground mx-1">@walletconnect/sign-client</code>
          is installed and a Cloud projectId is configured.
        </span>
      </div>

      {sessions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Active sessions</p>
          {sessions.map((s) => (
            <div
              key={s.topic}
              className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {s.peerName ?? "Unknown dApp"}
                </p>
                <p className="text-xs text-muted-foreground truncate">{s.topic}</p>
              </div>
              <button
                onClick={() => handleDisconnect(s.topic)}
                className="text-muted-foreground hover:text-destructive shrink-0 ml-2"
                aria-label="Disconnect"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {log.length > 0 && (
        <details className="mt-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer flex items-center gap-1">
            <RefreshCw size={12} /> Reconnect log ({log.length})
          </summary>
          <ul className="mt-2 space-y-1 max-h-32 overflow-auto">
            {log.slice(0, 20).map((e, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="truncate">{e.topic}</span>
                <span className={e.outcome === "restored" ? "text-primary" : "text-destructive"}>
                  {e.outcome} · {new Date(e.ts).toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};

export default WalletConnectCard;
