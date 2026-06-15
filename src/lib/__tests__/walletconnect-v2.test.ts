import { describe, it, expect, beforeEach } from "vitest";
import {
  parseWcUri,
  isWcUri,
  saveSession,
  listSessions,
  disconnectSession,
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
  });

  it("dedupes by topic on save", () => {
    saveSession({ topic: "t1", chains: [], accounts: [], createdAt: 1 });
    saveSession({ topic: "t1", chains: [], accounts: [], createdAt: 2 });
    expect(listSessions()).toHaveLength(1);
    expect(listSessions()[0].createdAt).toBe(2);
  });

  it("disconnectSession removes the topic", () => {
    saveSession({ topic: "t1", chains: [], accounts: [], createdAt: 1 });
    saveSession({ topic: "t2", chains: [], accounts: [], createdAt: 2 });
    disconnectSession("t1");
    const list = listSessions();
    expect(list).toHaveLength(1);
    expect(list[0].topic).toBe("t2");
  });
});

describe("walletconnect-v2 pair() scaffold", () => {
  it("returns the parsed URI", async () => {
    const u = await pair(sampleV2);
    expect(u.topic).toBe("7f6e504b...d3c8");
  });
});
