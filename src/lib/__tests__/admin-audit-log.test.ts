import { beforeEach, describe, expect, it } from "vitest";
import {
  getAuditLog,
  recordAudit,
  clearAuditLog,
  exportAuditLogJson,
} from "../admin-audit-log";

beforeEach(() => {
  localStorage.clear();
});

describe("admin-audit-log", () => {
  it("starts empty", () => {
    expect(getAuditLog()).toEqual([]);
  });

  it("records entries newest-first with id and ts", () => {
    recordAudit({ actor: "0xA", action: "admin.add", target: "0xB" });
    recordAudit({ actor: "0xA", action: "rpc.add", target: "https://x" });
    const log = getAuditLog();
    expect(log).toHaveLength(2);
    expect(log[0].action).toBe("rpc.add");
    expect(log[1].action).toBe("admin.add");
    expect(log[0].id).toBeTruthy();
    expect(typeof log[0].ts).toBe("number");
  });

  it("caps log at 500 entries", () => {
    for (let i = 0; i < 510; i++) {
      recordAudit({ actor: "0xA", action: "rpc.add", target: `url-${i}` });
    }
    expect(getAuditLog()).toHaveLength(500);
  });

  it("clear empties the log", () => {
    recordAudit({ actor: "0xA", action: "admin.add" });
    clearAuditLog();
    expect(getAuditLog()).toEqual([]);
  });

  it("export returns valid JSON", () => {
    recordAudit({ actor: "0xA", action: "admin.add", target: "0xB" });
    const json = exportAuditLogJson();
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].action).toBe("admin.add");
  });
});
