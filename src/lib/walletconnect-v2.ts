/**
 * WalletConnect v2 scaffolding
 * ----------------------------
 * Lightweight parsing + pairing scaffold for `wc:` URIs. The full
 * Sign API (`@walletconnect/sign-client`) is intentionally NOT pulled
 * in here to keep the bundle slim — this module exposes the seams a
 * future PR can wire up.
 *
 * Spec: https://specs.walletconnect.com/2.0/specs/clients/core/pairing/pairing-uri
 *
 * URI shape:
 *   wc:{topic}@{version}?relay-protocol={relay}&symKey={key}&expiryTimestamp={ts}
 */

export interface WcUri {
  topic: string;
  version: number;
  relayProtocol: string;
  symKey: string;
  expiryTimestamp?: number;
  methods?: string[];
}

export type WcSessionStatus = "pending" | "active" | "expired" | "disconnected";

export interface WcSession {
  topic: string;
  peerName?: string;
  peerUrl?: string;
  chains: string[]; // CAIP-2 e.g. "eip155:1"
  accounts: string[]; // CAIP-10 e.g. "eip155:1:0xabc..."
  createdAt: number;
  expiry?: number; // unix seconds
  status: WcSessionStatus;
  lastReconnectAt?: number;
}

export interface WcReconnectEvent {
  ts: number;
  topic: string;
  outcome: "restored" | "expired" | "failed";
  message?: string;
}

const SESSIONS_KEY = "gyds_wc_sessions_v2";
const RECONNECT_LOG_KEY = "gyds_wc_reconnect_log";
const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export function parseWcUri(raw: string): WcUri {
  if (!raw.startsWith("wc:")) {
    throw new Error("Not a WalletConnect URI (must start with wc:)");
  }
  const body = raw.slice(3);
  const [head, query = ""] = body.split("?");
  const [topic, versionStr] = head.split("@");
  if (!topic || !versionStr) {
    throw new Error("Malformed wc: URI — missing topic or version");
  }
  const version = Number(versionStr);
  if (Number.isNaN(version)) {
    throw new Error("Malformed wc: URI — version is not numeric");
  }
  const params = new URLSearchParams(query);
  const relayProtocol = params.get("relay-protocol") ?? "irn";
  const symKey = params.get("symKey") ?? "";
  if (version === 2 && !symKey) {
    throw new Error("Malformed wc: v2 URI — missing symKey");
  }
  const expiryTimestamp = params.get("expiryTimestamp")
    ? Number(params.get("expiryTimestamp"))
    : undefined;
  const methodsParam = params.get("methods");
  const methods = methodsParam
    ? methodsParam.replace(/^\[|\]$/g, "").split(",").filter(Boolean)
    : undefined;
  return { topic, version, relayProtocol, symKey, expiryTimestamp, methods };
}

export function isWcUri(raw: string): boolean {
  try {
    parseWcUri(raw);
    return true;
  } catch {
    return false;
  }
}

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

export function isExpired(s: WcSession, now: number = nowSec()): boolean {
  return typeof s.expiry === "number" && s.expiry > 0 && s.expiry <= now;
}

function rawList(): WcSession[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<WcSession>[]) : [];
    return parsed.map((s) => ({
      chains: [],
      accounts: [],
      createdAt: Date.now(),
      status: "active" as WcSessionStatus,
      ...s,
    })) as WcSession[];
  } catch {
    return [];
  }
}

/**
 * Persist a paired session locally. Sessions default to active status
 * with a 7-day TTL so `restoreSessions()` can transparently rehydrate
 * them after a page reload without re-pairing.
 */
export function saveSession(session: Partial<WcSession> & { topic: string }): WcSession {
  const merged: WcSession = {
    chains: [],
    accounts: [],
    createdAt: Date.now(),
    status: "active",
    expiry: nowSec() + DEFAULT_TTL_SECONDS,
    ...session,
  } as WcSession;
  if (typeof localStorage !== "undefined") {
    const all = rawList();
    const next = [merged, ...all.filter((s) => s.topic !== merged.topic)];
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
  }
  return merged;
}

/** Live (non-expired, non-disconnected) sessions for normal UI lists. */
export function listSessions(): WcSession[] {
  return rawList().filter((s) => s.status !== "disconnected" && !isExpired(s));
}

/** Every persisted session including expired/disconnected — for debug. */
export function listAllSessions(): WcSession[] {
  return rawList();
}

export function disconnectSession(topic: string): void {
  if (typeof localStorage === "undefined") return;
  const next = rawList().filter((s) => s.topic !== topic);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
}

/**
 * Rehydrate sessions after a page reload. Expired entries are flagged
 * but kept; live entries get their `lastReconnectAt` bumped and a
 * `restored` event is appended to the reconnect log.
 */
export function restoreSessions(now: number = nowSec()): WcSession[] {
  if (typeof localStorage === "undefined") return [];
  const all = rawList();
  if (all.length === 0) return [];
  const events: WcReconnectEvent[] = [];
  const updated = all.map((s) => {
    if (s.status === "disconnected") return s;
    if (isExpired(s, now)) {
      events.push({ ts: Date.now(), topic: s.topic, outcome: "expired" });
      return { ...s, status: "expired" as WcSessionStatus };
    }
    events.push({ ts: Date.now(), topic: s.topic, outcome: "restored" });
    return {
      ...s,
      status: "active" as WcSessionStatus,
      lastReconnectAt: Date.now(),
    };
  });
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(updated));
  appendReconnectEvents(events);
  return updated.filter((s) => s.status === "active");
}

function appendReconnectEvents(events: WcReconnectEvent[]): void {
  if (typeof localStorage === "undefined" || events.length === 0) return;
  const prev = getReconnectLog();
  const next = [...events, ...prev].slice(0, 100);
  localStorage.setItem(RECONNECT_LOG_KEY, JSON.stringify(next));
}

export function getReconnectLog(): WcReconnectEvent[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECONNECT_LOG_KEY);
    return raw ? (JSON.parse(raw) as WcReconnectEvent[]) : [];
  } catch {
    return [];
  }
}

export function clearReconnectLog(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(RECONNECT_LOG_KEY);
}

/**
 * Placeholder pairing entry point. Returns the parsed URI so the UI
 * can show a "Connecting to dApp…" state. Replace the body with
 * `signClient.pair({ uri })` once `@walletconnect/sign-client` is
 * installed and a WC Cloud projectId is configured.
 */
export async function pair(uri: string): Promise<WcUri> {
  const parsed = parseWcUri(uri);
  // TODO: integrate @walletconnect/sign-client.pair({ uri })
  // TODO: subscribe to "session_proposal" and emit it via an event bus
  return parsed;
}
