/**
 * Admin authentication via wallet address.
 * Admin wallets are defined in VITE_ADMIN_WALLETS env variable (comma-separated).
 * Only these wallets can see/access the admin panel.
 */

const ENV_ADMIN_WALLETS = import.meta.env.VITE_ADMIN_WALLETS || "";
const RUNTIME_ADMINS_KEY = "gyds_runtime_admins";

/** Get all admin wallet addresses (env + runtime-added by existing admins) */
export const getAdminWallets = (): string[] => {
  const envWallets = ENV_ADMIN_WALLETS
    .split(",")
    .map((w: string) => w.trim().toLowerCase())
    .filter((w: string) => w.startsWith("0x") && w.length === 42);

  const runtimeWallets = getRuntimeAdmins();
  const all = new Set([...envWallets, ...runtimeWallets]);
  return Array.from(all);
};

/** Check if a wallet address is an admin */
export const isAdminWallet = (address: string | null): boolean => {
  if (!address) return false;
  const admins = getAdminWallets();
  return admins.includes(address.toLowerCase());
};

/** Get runtime-added admin wallets (added by existing admins via the panel) */
const getRuntimeAdmins = (): string[] => {
  try {
    const stored = localStorage.getItem(RUNTIME_ADMINS_KEY);
    if (!stored) return [];
    return JSON.parse(stored).filter(
      (w: string) => typeof w === "string" && w.startsWith("0x") && w.length === 42
    );
  } catch {
    return [];
  }
};

/** Add a new admin wallet (only callable from admin panel) */
export const addAdminWallet = (address: string): boolean => {
  const normalized = address.trim().toLowerCase();
  if (!normalized.startsWith("0x") || normalized.length !== 42) return false;

  const current = getRuntimeAdmins();
  if (current.includes(normalized)) return false;

  current.push(normalized);
  localStorage.setItem(RUNTIME_ADMINS_KEY, JSON.stringify(current));
  return true;
};

/** Remove a runtime admin wallet (cannot remove env-defined admins) */
export const removeAdminWallet = (address: string): boolean => {
  const normalized = address.toLowerCase();
  const envWallets = ENV_ADMIN_WALLETS
    .split(",")
    .map((w: string) => w.trim().toLowerCase())
    .filter((w: string) => w.startsWith("0x"));

  if (envWallets.includes(normalized)) return false; // Can't remove env admins

  const current = getRuntimeAdmins();
  const updated = current.filter((w) => w !== normalized);
  localStorage.setItem(RUNTIME_ADMINS_KEY, JSON.stringify(updated));
  return true;
};

/** Check if an admin wallet is from env (non-removable) */
export const isEnvAdmin = (address: string): boolean => {
  return ENV_ADMIN_WALLETS
    .split(",")
    .map((w: string) => w.trim().toLowerCase())
    .includes(address.toLowerCase());
};
