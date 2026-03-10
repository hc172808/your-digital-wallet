import { ethers } from "ethers";
import { fetchPrices } from "./price-fetcher";
import { getActiveRpc } from "./network-config";

export interface SwapToken {
  symbol: string;
  name: string;
  contractAddress: string | null;
  decimals: number;
  color: string;
}

export interface SwapQuote {
  fromToken: SwapToken;
  toToken: SwapToken;
  fromAmount: string;
  toAmount: string;
  rate: string;
  priceImpact: number;
  fee: number;
  minimumReceived: string;
  route: string;
}

export const SWAP_TOKENS: SwapToken[] = [
  { symbol: "GYDS", name: "GYDS (Native)", contractAddress: null, decimals: 18, color: "from-cyan-400 to-teal-500" },
  { symbol: "GYD", name: "GYD Stablecoin", contractAddress: null, decimals: 18, color: "from-sky-400 to-cyan-500" },
  { symbol: "ETH", name: "Ethereum", contractAddress: null, decimals: 18, color: "from-blue-400 to-indigo-500" },
  { symbol: "USDT", name: "Tether", contractAddress: null, decimals: 6, color: "from-emerald-400 to-green-500" },
  { symbol: "BTC", name: "Bitcoin", contractAddress: null, decimals: 8, color: "from-amber-500 to-orange-500" },
  { symbol: "SOL", name: "Solana", contractAddress: null, decimals: 9, color: "from-purple-500 to-fuchsia-500" },
  { symbol: "AVAX", name: "Avalanche", contractAddress: null, decimals: 18, color: "from-red-400 to-rose-500" },
  { symbol: "MATIC", name: "Polygon", contractAddress: null, decimals: 18, color: "from-violet-500 to-purple-500" },
];

// Fetch live prices from CoinGecko
export const fetchSwapPrices = async (): Promise<Record<string, number>> => {
  const symbols = SWAP_TOKENS.map((t) => t.symbol);
  const prices = await fetchPrices(symbols);
  const result: Record<string, number> = {};
  for (const s of symbols) {
    result[s] = prices[s]?.usd ?? 0;
  }
  // Fallbacks for native tokens
  if (!result["GYDS"]) result["GYDS"] = 0.15;
  if (!result["GYD"]) result["GYD"] = 1.0;
  return result;
};

// Calculate swap quote using live prices
export const getSwapQuote = (
  fromToken: SwapToken,
  toToken: SwapToken,
  fromAmount: string,
  prices: Record<string, number>,
  slippage: number
): SwapQuote | null => {
  const amount = parseFloat(fromAmount);
  if (!amount || amount <= 0) return null;

  const fromPrice = prices[fromToken.symbol] ?? 0;
  const toPrice = prices[toToken.symbol] ?? 0;
  if (!fromPrice || !toPrice) return null;

  const rate = fromPrice / toPrice;
  const fee = 0.003; // 0.3%
  const rawToAmount = amount * rate;
  const toAmountAfterFee = rawToAmount * (1 - fee);
  const minimumReceived = toAmountAfterFee * (1 - slippage / 100);

  // Simulate price impact based on amount
  const priceImpact = Math.min(amount * fromPrice * 0.00001, 5);

  return {
    fromToken,
    toToken,
    fromAmount,
    toAmount: toAmountAfterFee.toFixed(6),
    rate: rate.toFixed(6),
    priceImpact: parseFloat(priceImpact.toFixed(2)),
    fee: parseFloat((rawToAmount * fee).toFixed(6)),
    minimumReceived: minimumReceived.toFixed(6),
    route: `${fromToken.symbol} → ${toToken.symbol}`,
  };
};

// Execute a swap transaction via the wallet
export const executeSwap = async (
  wallet: ethers.Wallet,
  quote: SwapQuote
): Promise<string> => {
  const rpc = await getActiveRpc();
  if (!rpc) throw new Error("No RPC endpoint available");

  const provider = new ethers.JsonRpcProvider(rpc);
  const connectedWallet = wallet.connect(provider);

  // For native token swaps, execute a simple transfer as proof-of-concept
  // In production, this would call a DEX router contract
  if (!quote.fromToken.contractAddress) {
    const tx = await connectedWallet.sendTransaction({
      to: connectedWallet.address, // Self-transfer for demo
      value: ethers.parseUnits(quote.fromAmount, quote.fromToken.decimals),
      data: ethers.hexlify(
        ethers.toUtf8Bytes(
          `GYDS_SWAP:${quote.fromToken.symbol}:${quote.toToken.symbol}:${quote.fromAmount}:${quote.toAmount}`
        )
      ),
    });
    const receipt = await tx.wait();
    return receipt?.hash ?? tx.hash;
  }

  // ERC-20 swap via router (placeholder for real DEX router)
  const ERC20_ABI = ["function transfer(address to, uint256 amount) returns (bool)"];
  const contract = new ethers.Contract(quote.fromToken.contractAddress, ERC20_ABI, connectedWallet);
  const amount = ethers.parseUnits(quote.fromAmount, quote.fromToken.decimals);
  const tx = await contract.transfer(connectedWallet.address, amount);
  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
};
