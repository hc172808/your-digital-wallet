// Browser polyfills that must run BEFORE any other module loads.
// Imported as the first statement in main.tsx so the assignments below
// execute before @solana/web3.js / walletconnect / etc. evaluate.
import { Buffer } from "buffer";

const g = globalThis as unknown as {
  Buffer?: typeof Buffer;
  global?: typeof globalThis;
  process?: { env: Record<string, string> };
};

if (!g.Buffer) g.Buffer = Buffer;
if (!g.global) g.global = globalThis;
if (!g.process) g.process = { env: {} };
