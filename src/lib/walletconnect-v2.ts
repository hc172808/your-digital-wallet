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

export interface WcSession {
  topic: string;
  peerName?: string;
  peerUrl?: string;
  chains: string[]; // CAIP-2 e.g. "eip155:1"
  accounts: string[]; // CAIP-10 e.g. "eip155:1:0xabc..."
  createdAt: number;
}

const SESSIONS_KEY = "gyds_wc_sessions_v2";

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

/**
 * Persist a paired session locally. The actual Relay + cryptographic
 * pairing is delegated to `@walletconnect/sign-client` once that
 * dependency is added; this stub just stores the metadata so the UI
 * can render an active-sessions list immediately.
 */
export function saveSession(session: WcSession): void {
  if (typeof localStorage === "undefined") return;
  const all = listSessions();
  const next = [session, ...all.filter((s) => s.topic !== session.topic)];
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
}

export function listSessions(): WcSession[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as WcSession[]) : [];
  } catch {
    return [];
  }
}

export function disconnectSession(topic: string): void {
  if (typeof localStorage === "undefined") return;
  const next = listSessions().filter((s) => s.topic !== topic);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
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
