import { getActiveRpc } from "@/lib/network-config";

/**
 * Fetch native (GYDS) balance for an address
 */
export const fetchNativeBalance = async (address: string): Promise<string> => {
  const rpc = await getActiveRpc();
  if (!rpc) return "0";

  try {
    const res = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBalance",
        params: [address, "latest"],
        id: 1,
      }),
    });
    const data = await res.json();
    if (data.result) {
      return formatBalance(data.result, 18);
    }
  } catch {
    // silent fail
  }
  return "0";
};

/**
 * Fetch ERC-20 token balance for an address
 * balanceOf(address) selector = 0x70a08231
 */
export const fetchTokenBalance = async (
  tokenAddress: string,
  walletAddress: string,
  decimals: number = 18
): Promise<string> => {
  const rpc = await getActiveRpc();
  if (!rpc) return "0";

  try {
    // Encode balanceOf(address) call
    const paddedAddress = walletAddress.toLowerCase().replace("0x", "").padStart(64, "0");
    const data = `0x70a08231${paddedAddress}`;

    const res = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_call",
        params: [{ to: tokenAddress, data }, "latest"],
        id: 1,
      }),
    });
    const result = await res.json();
    if (result.result && result.result !== "0x") {
      return formatBalance(result.result, decimals);
    }
  } catch {
    // silent fail
  }
  return "0";
};

/**
 * Fetch multiple token balances in parallel
 */
export const fetchAllTokenBalances = async (
  tokens: Array<{ contractAddress: string; decimals: number; symbol: string }>,
  walletAddress: string
): Promise<Record<string, string>> => {
  const results: Record<string, string> = {};

  const promises = tokens.map(async (token) => {
    const balance = await fetchTokenBalance(token.contractAddress, walletAddress, token.decimals);
    results[token.symbol] = balance;
  });

  await Promise.all(promises);
  return results;
};

/**
 * Format a hex balance with decimals to a human-readable string
 */
const formatBalance = (hexValue: string, decimals: number): string => {
  const raw = BigInt(hexValue);
  const divisor = BigInt(10 ** decimals);
  const whole = raw / divisor;
  const remainder = raw % divisor;

  if (remainder === BigInt(0)) {
    return whole.toLocaleString();
  }

  const remainderStr = remainder.toString().padStart(decimals, "0");
  // Show up to 4 decimal places
  const trimmed = remainderStr.slice(0, 4).replace(/0+$/, "");
  if (!trimmed) return whole.toLocaleString();
  return `${whole.toLocaleString()}.${trimmed}`;
};

/**
 * Get connected wallet address from MetaMask/injected provider
 */
export const getConnectedWallet = async (): Promise<string | null> => {
  const ethereum = (window as any).ethereum;
  if (!ethereum) return null;

  try {
    const accounts = await ethereum.request({ method: "eth_accounts" });
    return accounts?.[0] || null;
  } catch {
    return null;
  }
};

/**
 * Request wallet connection
 */
export const connectWallet = async (): Promise<string | null> => {
  const ethereum = (window as any).ethereum;
  if (!ethereum) return null;

  try {
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    return accounts?.[0] || null;
  } catch {
    return null;
  }
};
