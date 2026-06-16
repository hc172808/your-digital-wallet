import { describe, it, expect, beforeEach } from "vitest";
import {
  parseWcUri,
  isWcUri,
  saveSession,
  listSessions,
  listAllSessions,
  disconnectSession,
  restoreSessions,
  getReconnectLog,
  clearReconnectLog,
  isExpired,
  pair,
} from "../walletconnect-v2";

const sampleV2 =
  "wc:7f6e504b...d3c8@2?relay-protocol=irn&symKey=587d5484...8e62&expiryTimestamp=1717000000";

beforeEach(() => {
  localStorage.clear();
});

describe("walletconnect-v2 URI parsing", () => {
  it("parses a valid v2 URI", () => {
    const u = parseWcUri(sampleV2);
    expect(u.version).toBe(2);
    expect(u.topic).toBe("7f6e504b...d3c8");
    expect(u.relayProtocol).toBe("irn");
    expect(u.symKey).toBe("587d5484...8e62");
    expect(u.expiryTimestamp).toBe(1717000000);
  });

  it("rejects non-wc URIs", () => {
    expect(() => parseWcUri("https://example.com")).toThrow();
    expect(isWcUri("https://example.com")).toBe(false);
  });

  it("rejects v2 URI missing symKey", () => {
    expect(() => parseWcUri("wc:topic@2?relay-protocol=irn")).toThrow(/symKey/);
  });

  it("accepts v1 URI without symKey", () => {
    const u = parseWcUri("wc:topic@1?bridge=https://b.io");
    expect(u.version).toBe(1);
  });

  it("isWcUri true for valid uri", () => {
    expect(isWcUri(sampleV2)).toBe(true);
  });
});

describe("walletconnect-v2 session persistence", () => {
  it("starts empty", () => {
    expect(listSessions()).toEqual([]);
  });

  it("save then list returns the session", () => {
    saveSession({
      topic: "t1",
      peerName: "Uniswap",
      chains: ["eip155:1"],
      accounts: ["eip155:1:0xabc"],
      createdAt: 1,
    });
    const list = listSessions();
    expect(list).toHaveLength(1);
    expect(list[0].peerName).toBe("Uniswap");
    expect(list[0].status).toBe("active");
    expect(list[0].expiry).toBeGreaterThan(0);
  });

  it("dedupes by topic on save", () => {
    saveSession({ topic: "t1", createdAt: 1 });
    saveSession({ topic: "t1", createdAt: 2 });
    expect(listSessions()).toHaveLength(1);
    expect(listSessions()[0].createdAt).toBe(2);
  });

  it("disconnectSession removes the topic", () => {
    saveSession({ topic: "t1", createdAt: 1 });
    saveSession({ topic: "t2", createdAt: 2 });
    disconnectSession("t1");
    const list = listSessions();
    expect(list).toHaveLength(1);
    expect(list[0].topic).toBe("t2");
  });
});

describe("walletconnect-v2 auto-reconnect", () => {
  it("restoreSessions rehydrates live sessions and stamps lastReconnectAt", () => {
    saveSession({ topic: "t1", peerName: "Uniswap" });
    const restored = restoreSessions();
    expect(restored).toHaveLength(1);
    expect(restored[0].topic).toBe("t1");
    expect(restored[0].lastReconnectAt).toBeGreaterThan(0);
    const log = getReconnectLog();
    expect(log[0].outcome).toBe("restored");
  });

  it("flags expired sessions instead of restoring them", () => {
    const past = Math.floor(Date.now() / 1000) - 10;
    saveSession({ topic: "t1", expiry: past });
    const restored = restoreSessions();
    expect(restored).toHaveLength(0);
    const all = listAllSessions();
    expect(all[0].status).toBe("expired");
    expect(getReconnectLog()[0].outcome).toBe("expired");
  });

  it("isExpired returns true for past expiry", () => {
    expect(isExpired({ topic: "x", chains: [], accounts: [], createdAt: 0, status: "active", expiry: 1 })).toBe(true);
  });

  it("listSessions hides expired entries", () => {
    saveSession({ topic: "t1", expiry: Math.floor(Date.now() / 1000) - 1 });
    saveSession({ topic: "t2" });
    restoreSessions();
    const live = listSessions();
    expect(live.map((s) => s.topic)).toEqual(["t2"]);
  });

  it("clearReconnectLog empties the log", () => {
    saveSession({ topic: "t1" });
    restoreSessions();
    expect(getReconnectLog().length).toBeGreaterThan(0);
    clearReconnectLog();
    expect(getReconnectLog()).toEqual([]);
  });

  it("reconnect log is capped at 100 entries", () => {
    for (let i = 0; i < 60; i++) saveSession({ topic: `t${i}` });
    restoreSessions();
    restoreSessions();
    expect(getReconnectLog().length).toBeLessThanOrEqual(100);
  });
});

describe("walletconnect-v2 pair() scaffold", () => {
  it("returns the parsed URI", async () => {
    const u = await pair(sampleV2);
    expect(u.topic).toBe("7f6e504b...d3c8");
  });
});
