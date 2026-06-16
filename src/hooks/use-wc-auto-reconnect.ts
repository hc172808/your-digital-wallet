import { useEffect, useState } from "react";
import { restoreSessions, type WcSession } from "@/lib/walletconnect-v2";

/**
 * Rehydrates persisted WalletConnect v2 sessions on mount so a page
 * reload doesn't drop the user's dApp connections. Returns the live
 * sessions that were restored.
 */
export function useWcAutoReconnect(): WcSession[] {
  const [restored, setRestored] = useState<WcSession[]>([]);
  useEffect(() => {
    setRestored(restoreSessions());
  }, []);
  return restored;
}
