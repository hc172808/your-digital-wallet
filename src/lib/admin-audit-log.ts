/**
 * Admin audit log — local, append-only record of admin governance actions.
 * Stored in localStorage. Bounded to last 500 entries.
 * Future: mirror to Lovable Cloud table for cross-device persistence.
 */

export type AuditAction =
  | "admin.add"
  | "admin.remove"
  | "rpc.add"
  | "rpc.remove"
  | "rpc.disable"
  | "rpc.enable"
  | "chain.kill"
  | "chain.revive"
  | "detection.toggle"
  | "config.reset";

export interface AuditEntry {
  id: string;
  ts: number;
  actor: string;        // wallet address that performed the action
  action: AuditAction;
  target?: string;      // address / RPC URL / chain id
  meta?: Record<string, unknown>;
}

const KEY = "gyds_admin_audit_log";
const MAX_ENTRIES = 500;

export function getAuditLog(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordAudit(entry: Omit<AuditEntry, "id" | "ts">): AuditEntry {
  const full: AuditEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    ...entry,
  };
  const log = getAuditLog();
  log.unshift(full);
  if (log.length > MAX_ENTRIES) log.length = MAX_ENTRIES;
  try {
    localStorage.setItem(KEY, JSON.stringify(log));
  } catch {
    // storage full — drop silently
  }
  return full;
}

export function clearAuditLog(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function exportAuditLogJson(): string {
  return JSON.stringify(getAuditLog(), null, 2);
}
