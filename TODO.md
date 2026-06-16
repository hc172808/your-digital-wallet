# GYDS Wallet — TODO

## ✅ Done

- Self-custodial PWA wallet (EVM + Solana balances, swap, send/receive)
- Token Detail page with CoinGecko charts and "Set price alert" CTA
- Price Alerts page: dynamic CoinGecko symbol validation, sensitivity slider,
  per-alert sound/vibration, global push toggle, JSON export/import
- Background service worker (`public/alerts-sw.js`) that polls CoinGecko via
  `periodicsync` (where supported) and shows OS notifications when the app
  is closed — registered with a narrow scope so it never intercepts navigation
- Notification permission card with denied-state troubleshooting
  (iOS install hint, Chrome/Safari/Android steps, Test button)
- Cloud sync card (email + password) — UI ready; backend table added via
  migration `price_alerts_sync` (RLS: each user owns their row)
- Admin Chains tab: per-network RPC list, add+validate (eth_chainId / getHealth),
  per-URL **Disable** toggle (skipped in failover, kept for re-enable),
  remove, reset, and full-network kill switch
- GYD decimals fixed to 6 across Send / Swap / TokenDetail
- Vitest coverage:
  - `src/lib/__tests__/price-alerts.test.ts` — trigger logic, idempotency,
    sound/vibration/push, permission helper, export/import
  - `src/hooks/__tests__/use-price-alert-monitor.test.tsx` — polling + toast
- `mobile/` folder with Capacitor config, Bubblewrap manifest, and
  PWABuilder JSON for direct upload to Android Studio / pwabuilder.com
- Multi-chain Send/Receive: ChainSelector on both pages; Send routes through
  EVMAdapter for any enabled EVM chain (GYDS, Ethereum, Polygon, …); token
  list filters to the active chain's native + imported tokens; Receive QR
  uses EIP-681 with the correct `chainId` per chain (and `solana:` for SOL)

## 🗺️ Roadmap (added 2026-06-15)

### Security & Hardening
- [ ] Replace hardcoded super-admin address with signed-message verification (SIWE-style nonce)
- [ ] RPC rate limiting per session (token bucket in `balance-fetcher.ts`)
- [ ] Encrypted backup/export with password-derived key rotation (PBKDF2 → Argon2id)
- [ ] Admin action audit log table (who/when/what)

### Wallet Features
- [ ] WalletConnect v2 support (EIP-1193 + EIP-6963 multi-injector)
- [ ] Transaction simulation preview (Tenderly or local trace) before signing
- [ ] ENS / SNS name resolution in Send flow
- [ ] Address book with labels and starred contacts

### Multi-chain
- [ ] Add Base, Arbitrum, Optimism, BSC to default chain registry
- [ ] Bridge integration (LI.FI or Socket) with quote comparison
- [ ] Per-chain gas-token auto-detection (native symbol + decimals)

### PWA / Offline
- [ ] Background Sync API for queued transactions
- [ ] Web Push for price alerts (VAPID + edge function)
- [ ] iOS "Add to Home Screen" interactive tutorial

### Admin / Ops
- [ ] Health metrics dashboard (RPC p95 latency, error rate, block lag)
- [ ] Feature flags table with per-flag rollout %
- [ ] Audit log viewer (paginated, filter by admin/action)

### Testing / CI
- [ ] GitHub Actions: vitest + playwright + lint on PR
- [ ] Lighthouse CI budget (PWA ≥ 95, Perf ≥ 90)
- [ ] Visual regression with Playwright screenshots

### UX Polish
- [ ] Skeleton loaders for AssetsList, TokenDetail, Portfolio chart
- [ ] Pull-to-refresh on dashboard (touch gesture)
- [ ] Haptic feedback on tx confirm / alert trigger

### In progress (this turn)
- [x] Add roadmap to TODO.md
- [x] Admin audit-log table + viewer (`admin-audit-log.ts` + `AdminAuditLog.tsx`, 13 tests)
- [x] WalletConnect v2 scaffolding (`walletconnect-v2.ts` URI parser + session store, `WalletConnectCard` in Settings, 9 tests).
- [x] WalletConnect v2 session persistence + auto-reconnect (`restoreSessions`, `useWcAutoReconnect` hook, reconnect log UI, 15 tests). Next: install `@walletconnect/sign-client` and wire `pair()` to the real relay.
- [x] Removed password-confirm field on wallet create; replaced with AlertDialog confirm popup
- [ ] Next up: ENS / SNS resolution in Send flow

## 🟡 Next (handoff to dev)

- Resume Lovable Cloud, then run pending migration so `CloudSyncCard`
  push/pull lights up end-to-end
- Add Google OAuth provider in Cloud → Auth (CloudSyncCard already opens
  on the right tab to add a "Continue with Google" button)
- Wire `@capacitor/push-notifications` + an FCM-backed edge function for
  true server-pushed alerts when the OS has killed the SW (see
  `mobile/notes/push.md`)
- Whale-tracking + alpha-token signal alerts (extend `price-alerts.ts`
  with a `kind: "whale" | "price"` discriminator)
- Per-URL latency benchmark in Admin (validate-all bulk button + green/red
  badge with ms latency)
- E2E test for the SW bridge (`alerts-sw-bridge.ts`) under Playwright

## ⚠️ Platform notes

- iOS Safari does **not** support `periodicsync`. Background alerts there
  fire only while the SW is recently active, so iOS users should keep the
  app installed to the Home Screen and open it occasionally.
- Lovable preview iframe deliberately unregisters all SWs in `main.tsx`
  to avoid stale-cache issues — background push only works on the
  published / deployed origin.
