/**
 * Per-chain asset list helpers.
 *
 * Builds the canonical list of tokens visible on a given chain — used by the
 * Send picker, Receive screen, and any UI that needs "what can I hold on
 * chain X" without re-implementing the filter rules in three places.
 */

import { getCustomTokens, type CustomToken } from "@/lib/custom-tokens";
import { getHiddenTokens } from "@/lib/hidden-tokens";
import type { ChainConfig } from "@/lib/chain-adapter";

export interface ChainAsset {
  symbol: string;
  name: string;
  /** null = native asset (GYDS, ETH, MATIC, SOL…), string = ERC-20 contract */
  contractAddress: string | null;
  decimals: number;
  chainId: number;
  /** Tailwind gradient for the fallback coin icon */
  color: string;
  isNative: boolean;
}

const NATIVE_COLORS: Record<string, string> = {
  gyds: "from-cyan-400 to-teal-500",
  ethereum: "from-indigo-400 to-blue-500",
  polygon: "from-violet-400 to-purple-500",
  solana: "from-purple-500 to-fuchsia-500",
};

/**
 * Compare a custom token's chainId to the active chain.
 * Tokens with no `chainId` field are treated as GYDS for backward compatibility
 * with pre-multichain imports.
 */
export const tokenMatchesChain = (
  token: Pick<CustomToken, "chainId">,
  chain: ChainConfig,
): boolean => {
  const tokenChain = token.chainId ?? 13370;
  const target = chain.chainId ?? 13370;
  return tokenChain === target;
};

export const getChainAssets = (
  chain: ChainConfig,
  opts: { includeHidden?: boolean } = {},
): ChainAsset[] => {
  const native: ChainAsset = {
    symbol: chain.symbol,
    name: `${chain.name} (Native)`,
    contractAddress: null,
    decimals: chain.decimals,
    chainId: chain.chainId ?? 0,
    color: NATIVE_COLORS[chain.id] || "from-slate-400 to-slate-600",
    isNative: true,
  };

  const extras: ChainAsset[] = [];
  // GYD stablecoin is a first-class GYDS asset.
  if (chain.id === "gyds") {
    extras.push({
      symbol: "GYD",
      name: "GYD Stablecoin",
      contractAddress: null,
      decimals: 6,
      chainId: 13370,
      color: "from-sky-400 to-cyan-500",
      isNative: false,
    });
  }

  const custom = getCustomTokens()
    .filter((t) => tokenMatchesChain(t, chain))
    .map<ChainAsset>((t) => ({
      symbol: t.symbol,
      name: t.name,
      contractAddress: t.contractAddress,
      decimals: t.decimals,
      chainId: t.chainId ?? 13370,
      color: t.color,
      isNative: false,
    }));

  const all = [native, ...extras, ...custom];
  if (opts.includeHidden) return all;

  const hidden = new Set(getHiddenTokens().map((s) => s.toUpperCase()));
  // Never hide the native asset — users always need to see their gas balance.
  return all.filter((a) => a.isNative || !hidden.has(a.symbol.toUpperCase()));
};
