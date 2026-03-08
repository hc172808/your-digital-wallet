import { ethers } from "ethers";

const WALLET_KEY = "gyds_wallet_encrypted";
const WALLET_ADDR_KEY = "gyds_wallet_address";
const BALANCE_HISTORY_KEY = "gyds_balance_history";

export interface WalletData {
  address: string;
  encryptedJson: string;
}

export interface BalanceSnapshot {
  timestamp: number;
  usd: number;
}

/**
 * Check if a wallet exists in storage
 */
export const hasWallet = (): boolean => {
  return !!localStorage.getItem(WALLET_KEY);
};

/**
 * Get stored wallet address (no password needed)
 */
export const getWalletAddress = (): string | null => {
  return localStorage.getItem(WALLET_ADDR_KEY);
};

/**
 * Create a new wallet with a password
 * Returns the mnemonic phrase for backup
 */
export const createWallet = async (password: string): Promise<{ address: string; mnemonic: string }> => {
  const wallet = ethers.Wallet.createRandom();
  const mnemonic = wallet.mnemonic?.phrase;
  if (!mnemonic) throw new Error("Failed to generate mnemonic");

  const encrypted = await wallet.encrypt(password);
  localStorage.setItem(WALLET_KEY, encrypted);
  localStorage.setItem(WALLET_ADDR_KEY, wallet.address);

  return { address: wallet.address, mnemonic };
};

/**
 * Import wallet from mnemonic phrase
 */
export const importFromMnemonic = async (mnemonic: string, password: string): Promise<string> => {
  const wallet = ethers.Wallet.fromPhrase(mnemonic.trim());
  const encrypted = await wallet.encrypt(password);
  localStorage.setItem(WALLET_KEY, encrypted);
  localStorage.setItem(WALLET_ADDR_KEY, wallet.address);
  return wallet.address;
};

/**
 * Import wallet from private key
 */
export const importFromPrivateKey = async (privateKey: string, password: string): Promise<string> => {
  const key = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  const wallet = new ethers.Wallet(key);
  const encrypted = await wallet.encrypt(password);
  localStorage.setItem(WALLET_KEY, encrypted);
  localStorage.setItem(WALLET_ADDR_KEY, wallet.address);
  return wallet.address;
};

/**
 * Decrypt wallet and return the signer (needed for transactions)
 */
export const unlockWallet = async (password: string): Promise<ethers.Wallet> => {
  const encrypted = localStorage.getItem(WALLET_KEY);
  if (!encrypted) throw new Error("No wallet found");
  return ethers.Wallet.fromEncryptedJson(encrypted, password) as Promise<ethers.Wallet>;
};

/**
 * Export private key (requires password)
 */
export const exportPrivateKey = async (password: string): Promise<string> => {
  const wallet = await unlockWallet(password);
  return wallet.privateKey;
};

/**
 * Export mnemonic phrase (requires password)
 */
export const exportMnemonic = async (password: string): Promise<string | null> => {
  const wallet = await unlockWallet(password);
  return wallet.mnemonic?.phrase || null;
};

/**
 * Delete wallet from storage
 */
export const deleteWallet = (): void => {
  localStorage.removeItem(WALLET_KEY);
  localStorage.removeItem(WALLET_ADDR_KEY);
  localStorage.removeItem(BALANCE_HISTORY_KEY);
};

/**
 * Save a balance snapshot for portfolio chart
 */
export const saveBalanceSnapshot = (usd: number): void => {
  const history = getBalanceHistory();
  const now = Date.now();
  // Only save one snapshot per hour
  const lastEntry = history[history.length - 1];
  if (lastEntry && now - lastEntry.timestamp < 3600000) return;

  history.push({ timestamp: now, usd });
  // Keep last 365 entries
  if (history.length > 365) history.splice(0, history.length - 365);
  localStorage.setItem(BALANCE_HISTORY_KEY, JSON.stringify(history));
};

/**
 * Get balance history for portfolio chart
 */
export const getBalanceHistory = (): BalanceSnapshot[] => {
  try {
    const stored = localStorage.getItem(BALANCE_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

/**
 * Send native token using unlocked wallet
 */
export const sendNativeTransaction = async (
  wallet: ethers.Wallet,
  to: string,
  amountEther: string,
  rpcUrl: string
): Promise<string> => {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = wallet.connect(provider);
  const tx = await signer.sendTransaction({
    to,
    value: ethers.parseEther(amountEther),
  });
  return tx.hash;
};

/**
 * Send ERC-20 token using unlocked wallet
 */
export const sendERC20Transaction = async (
  wallet: ethers.Wallet,
  tokenAddress: string,
  to: string,
  amount: string,
  decimals: number,
  rpcUrl: string
): Promise<string> => {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = wallet.connect(provider);
  const iface = new ethers.Interface(["function transfer(address to, uint256 amount) returns (bool)"]);
  const data = iface.encodeFunctionData("transfer", [to, ethers.parseUnits(amount, decimals)]);
  const tx = await signer.sendTransaction({ to: tokenAddress, data });
  return tx.hash;
};
