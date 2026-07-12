import { useEffect, useRef, useState } from "react";
import { EVMAdapter, type ChainConfig } from "@/lib/chain-adapter";
import { getActiveRpc } from "@/lib/network-config";
import { fetchBalance, fetchTokenBalance } from "@/lib/wallet-core";
import type { ChainAsset } from "@/lib/chain-assets";

/**
 * Fetch live balances for every asset on the active chain.
 * Returns a map keyed by `${symbol}:${contractAddress ?? "native"}` so the same
 * symbol on multiple chains never collides.
 */
export function useChainBalances(
  chain: ChainConfig,
  assets: ChainAsset[],
  walletAddress: string | null,
  refreshKey: number = 0,
) {
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!walletAddress || chain.type !== "evm" || assets.length === 0) {
      setBalances({});
      return;
    }
    let cancelled = false;
    setLoading(true);

    const isGyds = chain.id === "gyds";
    const run = async () => {
      const next: Record<string, string> = {};
      const adapter = isGyds ? null : new EVMAdapter(chain);

      await Promise.all(
        assets.map(async (a) => {
          const key = `${a.symbol}:${a.contractAddress ?? "native"}`;
          try {
            if (isGyds) {
              const rpc = await getActiveRpc();
              if (!rpc) { next[key] = "0"; return; }
              next[key] = a.contractAddress
                ? await fetchTokenBalance(walletAddress, a.contractAddress, a.decimals, rpc)
                : await fetchBalance(walletAddress, rpc);
            } else {
              next[key] = a.contractAddress
                ? await adapter!.getTokenBalance(a.contractAddress, walletAddress, a.decimals)
                : await adapter!.getNativeBalance(walletAddress);
            }
          } catch {
            next[key] = "0";
          }
        }),
      );

      if (!cancelled) {
        setBalances(next);
        setLoading(false);
      }
    };

    run();
    // Periodic refresh while page is open
    const interval = setInterval(run, 30000);
    // Refresh on window focus / tab visibility — catches balance changes
    // that happened while the user was away (incoming transfers, swaps, etc).
    const onFocus = () => run();
    const onVisible = () => { if (document.visibilityState === "visible") run(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [walletAddress, chain.id, assets.length, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { balances, loading };
}

export const balanceKey = (a: ChainAsset) =>
  `${a.symbol}:${a.contractAddress ?? "native"}`;
