# GYDS Wallet — TODO / Hand-off

Status of features in this iteration and what's left for the next dev/AI.

## ✅ Completed in this iteration

- **GYD decimals fix**: GYD stablecoin now uses `decimals: 6` everywhere
  (`Send.tsx`, `dex-swap.ts`, `TokenDetail.tsx`).
- **Admin wallet added**: `0x6422D12BFADdEE5142BFaD21b3006a74D09017B1`
  added to `.env` and `.env.example` `VITE_ADMIN_WALLETS`.
- **Admin → Chains tab**: per-network RPC editor at `/admin`. Add/remove
  RPCs, validates `eth_chainId`/`getHealth` before saving, force-disable
  whole chains, reset to defaults. Backed by `setChainRpcUrls` /
  `setChainForceDisabled` in `src/lib/chain-adapter.ts`.
- **Custom-symbol Price Alerts**: enter any symbol; validated against
  CoinGecko `/search` (`validateSymbolWithCoinGecko`). Symbol → CoinGecko
  id is persisted and re-hydrated on app boot.
- **Push notifications**: `requestNotificationPermission()` + `pushNotify()`
  fire OS-level alerts when permission is granted.
- **Sound + vibration**: WebAudio "ping" + `navigator.vibrate`. Per-alert
  override icons in the alert row, global toggles in Settings.
- **Sensitivity toggle**: low (2 min) / normal (30 s) / high (5 s) drives
  the polling interval (`getPollIntervalMs`).
- **Faster in-page refresh**: `/alerts` polls every 8 s for prices and
  10 s for triggers regardless of global sensitivity.
- **Real-time triggered status**: triggered alerts now show `✓ Triggered
  at $X · HH:MM:SS` and sort to the bottom.
- **Export / Import alerts**: JSON download + paste/file upload, with
  Merge or Replace modes (`exportAlerts` / `importAlerts`).

## 🟡 Verification still needed

- Toggle each chain in Admin → Chains and confirm assets list / swap /
  network status reflect the change.
- Test push permission flow on Android Chrome (iOS Safari ≥ 16.4 only
  supports notifications for installed PWAs).
- Confirm vibrate works on physical Android device.

## 🔜 Recommended next steps

1. **Backend-synced alerts** (cross-device): move `price-alerts` storage
   behind Lovable Cloud (Supabase) so users don't need export/import.
2. **Service-worker alerts**: register a Workbox background sync to fire
   alerts even when the tab is closed.
3. **Per-chain GYD decimals**: confirm any contract deployments use
   `decimals = 6` and update the GYD contract address registry.
4. **PWA polish**: re-test install flow + offline shell; the kill-switch
   SW doc is already in `useful-context`.
5. **Alert formulas**: support `% change in 24h` and `crosses MA(50)`
   alongside fixed thresholds.
6. **Whale alerts**: integrate `/alpha` whale wallet feed into the alert
   monitor.

## 🗂 Key files touched

- `src/lib/price-alerts.ts` — settings, sound/vibrate, push, export/import
- `src/lib/price-fetcher.ts` — `validateSymbolWithCoinGecko`, `registerSymbolId`
- `src/hooks/use-price-alert-monitor.ts` — sensitivity-driven polling
- `src/pages/PriceAlerts.tsx` — full UI rebuild
- `src/lib/chain-adapter.ts` — RPC overrides + force-disable
- `src/pages/Admin.tsx` — Chains tab
- `.env`, `.env.example` — new admin wallet
