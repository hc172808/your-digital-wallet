import { useEffect } from "react";
import { toast } from "sonner";
import { checkAlerts } from "@/lib/price-alerts";
import { formatPrice } from "@/lib/price-fetcher";

/**
 * App-wide hook that polls active price alerts every 60s
 * and shows a toast when one triggers.
 */
export function usePriceAlertMonitor(intervalMs = 60_000) {
  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      const triggered = await checkAlerts();
      if (cancelled) return;
      for (const t of triggered) {
        toast.success(`🔔 ${t.symbol} ${t.direction} ${formatPrice(t.threshold)}`, {
          description: `Now trading at ${formatPrice(t.price)}`,
          duration: 8000,
        });
      }
    };

    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);
}
