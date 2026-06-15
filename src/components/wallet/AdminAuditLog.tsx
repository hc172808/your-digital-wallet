import { useEffect, useState } from "react";
import { Download, Trash2, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  getAuditLog,
  clearAuditLog,
  exportAuditLogJson,
  type AuditEntry,
} from "@/lib/admin-audit-log";

const ACTION_COLOR: Record<string, string> = {
  "admin.add": "text-emerald-400",
  "admin.remove": "text-rose-400",
  "rpc.add": "text-emerald-400",
  "rpc.remove": "text-rose-400",
  "rpc.disable": "text-amber-400",
  "rpc.enable": "text-emerald-400",
  "chain.kill": "text-rose-400",
  "chain.revive": "text-emerald-400",
  "detection.toggle": "text-sky-400",
  "config.reset": "text-amber-400",
};

function shortAddr(a?: string) {
  if (!a) return "—";
  return a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

export default function AdminAuditLog({ canMutate }: { canMutate: boolean }) {
  const { toast } = useToast();
  const [entries, setEntries] = useState<AuditEntry[]>([]);

  const refresh = () => setEntries(getAuditLog());

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 2000);
    return () => window.clearInterval(id);
  }, []);

  const handleExport = () => {
    const blob = new Blob([exportAuditLogJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gyds-audit-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Audit log exported", description: `${entries.length} entries` });
  };

  const handleClear = () => {
    if (!canMutate) return;
    clearAuditLog();
    refresh();
    toast({ title: "Audit log cleared" });
  };

  return (
    <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Audit Log</h3>
          <span className="text-xs text-muted-foreground">({entries.length})</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={handleExport} disabled={!entries.length}>
            <Download className="h-3 w-3 mr-1" /> Export
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClear}
            disabled={!canMutate || !entries.length}
            title={!canMutate ? "Super admin only" : "Clear log"}
          >
            <Trash2 className="h-3 w-3 mr-1" /> Clear
          </Button>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          No admin actions recorded yet.
        </p>
      ) : (
        <div className="max-h-80 overflow-y-auto space-y-1 text-xs font-mono">
          {entries.map((e) => (
            <div
              key={e.id}
              className="grid grid-cols-[auto_1fr] gap-2 p-2 rounded bg-background/40 border border-border/20"
            >
              <span className="text-muted-foreground whitespace-nowrap">
                {new Date(e.ts).toLocaleString()}
              </span>
              <div className="min-w-0">
                <span className={`font-semibold ${ACTION_COLOR[e.action] ?? "text-foreground"}`}>
                  {e.action}
                </span>
                <span className="text-muted-foreground"> by </span>
                <span>{shortAddr(e.actor)}</span>
                {e.target && (
                  <>
                    <span className="text-muted-foreground"> → </span>
                    <span className="break-all">{shortAddr(e.target)}</span>
                  </>
                )}
                {e.meta && Object.keys(e.meta).length > 0 && (
                  <div className="text-[10px] text-muted-foreground mt-0.5 break-all">
                    {JSON.stringify(e.meta)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
