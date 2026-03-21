// Gas fee estimation for GYDS Network
import { getActiveRpc } from "./network-config";

export interface FeeEstimate {
  gasPrice: string; // in Gwei
  gasLimit: number;
  totalFeeEth: string; // in native token
  totalFeeUsd: string;
}

export const estimateGasFee = async (
  from: string,
  to: string,
  value: string,
  data?: string,
  nativeUsdPrice?: number
): Promise<FeeEstimate | null> => {
  const rpc = await getActiveRpc();
  if (!rpc) return null;

  try {
    // Get gas price
    const gasPriceRes = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "eth_gasPrice", params: [], id: 1 }),
    });
    const gasPriceData = await gasPriceRes.json();
    const gasPriceWei = parseInt(gasPriceData.result || "0x0", 16);

    // Estimate gas
    const estimateBody: any = { from, to };
    if (value && value !== "0") {
      estimateBody.value = "0x" + BigInt(Math.floor(parseFloat(value) * 1e18)).toString(16);
    }
    if (data) estimateBody.data = data;

    const gasEstRes = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "eth_estimateGas", params: [estimateBody], id: 2 }),
    });
    const gasEstData = await gasEstRes.json();
    const gasLimit = gasEstData.result ? parseInt(gasEstData.result, 16) : 21000;

    const totalWei = gasPriceWei * gasLimit;
    const totalEth = totalWei / 1e18;
    const gasPriceGwei = gasPriceWei / 1e9;

    return {
      gasPrice: gasPriceGwei < 0.01 ? gasPriceGwei.toExponential(2) : gasPriceGwei.toFixed(2),
      gasLimit,
      totalFeeEth: totalEth < 0.000001 ? totalEth.toExponential(2) : totalEth.toFixed(6),
      totalFeeUsd: nativeUsdPrice
        ? `$${(totalEth * nativeUsdPrice).toFixed(4)}`
        : "—",
    };
  } catch {
    return null;
  }
};
