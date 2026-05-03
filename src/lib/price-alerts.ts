/**
 * Price alerts: localStorage-backed thresholds with toast triggers.
 */
import { fetchPrices } from "@/lib/price-fetcher";

const STORAGE_KEY = "gyds_price_alerts_v1";
const LOG_KEY = "gyds_price_alerts_log_v1";

export type AlertDirection = "above" | "below";

export interface PriceAlert {
  id: string;
  symbol: string;
  threshold: number;
  direction: AlertDirection;
  createdAt: number;
  triggeredAt?: number;
  active: boolean;
}

export interface AlertLogEntry {
  id: string;
  alertId: string;
  symbol: string;
  threshold: number;
  direction: AlertDirection;
  price: number;
  triggeredAt: number;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota — ignore */
  }
}

export function getAlerts(): PriceAlert[] {
  return read<PriceAlert[]>(STORAGE_KEY, []);
}

export function saveAlerts(alerts: PriceAlert[]) {
  write(STORAGE_KEY, alerts);
}

export function addAlert(input: Omit<PriceAlert, "id" | "createdAt" | "active">): PriceAlert {
  const alert: PriceAlert = {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    active: true,
  };
  const all = getAlerts();
  all.push(alert);
  saveAlerts(all);
  return alert;
}

export function removeAlert(id: string) {
  saveAlerts(getAlerts().filter((a) => a.id !== id));
}

export function toggleAlert(id: string) {
  saveAlerts(
    getAlerts().map((a) => (a.id === id ? { ...a, active: !a.active } : a))
  );
}

export function getLog(): AlertLogEntry[] {
  return read<AlertLogEntry[]>(LOG_KEY, []);
}

export function clearLog() {
  write(LOG_KEY, []);
}

function appendLog(entry: AlertLogEntry) {
  const log = getLog();
  log.unshift(entry);
  write(LOG_KEY, log.slice(0, 100));
}

/**
 * Check all active alerts against current prices.
 * Returns array of newly-triggered alerts.
 */
export async function checkAlerts(): Promise<AlertLogEntry[]> {
  const alerts = getAlerts();
  const active = alerts.filter((a) => a.active && !a.triggeredAt);
  if (active.length === 0) return [];

  const symbols = [...new Set(active.map((a) => a.symbol.toUpperCase()))];
  const prices = await fetchPrices(symbols);

  const triggered: AlertLogEntry[] = [];
  const updated = alerts.map((a) => {
    if (!a.active || a.triggeredAt) return a;
    const p = prices[a.symbol.toUpperCase()];
    if (!p) return a;
    const hit =
      (a.direction === "above" && p.usd >= a.threshold) ||
      (a.direction === "below" && p.usd <= a.threshold);
    if (!hit) return a;

    const entry: AlertLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      alertId: a.id,
      symbol: a.symbol,
      threshold: a.threshold,
      direction: a.direction,
      price: p.usd,
      triggeredAt: Date.now(),
    };
    triggered.push(entry);
    appendLog(entry);
    return { ...a, triggeredAt: entry.triggeredAt, active: false };
  });

  if (triggered.length > 0) saveAlerts(updated);
  return triggered;
}
