import { useState, useEffect } from "react";
import { Link2, Trash2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  isWcUri,
  pair,
  listSessions,
  disconnectSession,
  saveSession,
  type WcSession,
} from "@/lib/walletconnect-v2";

const WalletConnectCard = () => {
  const [uri, setUri] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessions, setSessions] = useState<WcSession[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    setSessions(listSessions());
  }, []);

  const handlePair = async () => {
    if (!isWcUri(uri.trim())) {
      toast({ title: "Invalid WalletConnect URI", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const parsed = await pair(uri.trim());
      // Stub: persist a pending session so the UI reflects the pairing
      saveSession({
        topic: parsed.topic,
        peerName: "Pending dApp",
        chains: [],
        accounts: [],
        createdAt: Date.now(),
      });
      setSessions(listSessions());
      setUri("");
      toast({
        title: "Pairing started",
        description: "Sign client integration pending — see walletconnect-v2.ts",
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
    </div>
  );
};

export default WalletConnectCard;
