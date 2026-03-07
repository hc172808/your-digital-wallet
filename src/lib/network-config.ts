export interface NetworkConfig {
  name: string;
  symbol: string;
  chainId: number;
  chainIdHex: string;
  decimals: number;
  blockExplorer: string;
  rpcUrls: string[];
}

const DEFAULT_RPC_URLS = [
  "https://rpc.netlifegy.com",
  "https://rpc2.netlifegy.com",
  "https://rpc3.netlifegy.com",
  "https://localhost:8546",
  "https://192.168.18.106:8546",
];

const STORAGE_KEY = "gyds_network_config";
const ADMIN_KEY = "gyds_admin_hash";

export const getDefaultNetwork = (): NetworkConfig => ({
  name: "GYDS Network",
  symbol: "GYDS",
  chainId: 13370,
  chainIdHex: "0x343A",
  decimals: 18,
  blockExplorer: "https://explorer.netlifegy.com",
  rpcUrls: DEFAULT_RPC_URLS,
});

export const getNetworkConfig = (): NetworkConfig => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...getDefaultNetwork(), ...parsed };
    }
  } catch {
    // fallback to default
  }
  return getDefaultNetwork();
};

export const saveNetworkConfig = (config: NetworkConfig): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

// Simple hash for admin password (not cryptographically secure, but sufficient for localStorage-based admin)
const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

export const isAdminSetup = (): boolean => {
  return !!localStorage.getItem(ADMIN_KEY);
};

export const setupAdmin = async (password: string): Promise<void> => {
  const hash = await hashPassword(password);
  localStorage.setItem(ADMIN_KEY, hash);
};

export const verifyAdmin = async (password: string): Promise<boolean> => {
  const storedHash = localStorage.getItem(ADMIN_KEY);
  if (!storedHash) return false;
  const hash = await hashPassword(password);
  return hash === storedHash;
};

export const getActiveRpc = async (): Promise<string | null> => {
  const config = getNetworkConfig();
  for (const url of config.rpcUrls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "eth_chainId", params: [], id: 1 }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) return url;
    } catch {
      continue;
    }
  }
  return config.rpcUrls[0]; // fallback to primary
};

export const APP_VERSION = "1.2.0";
