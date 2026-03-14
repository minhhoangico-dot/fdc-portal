import fs from "fs";
import path from "path";
import { BRIDGE_HEALTH_ROW_ID } from "../../src/lib/bridgeHealth";

describe("bridge health row constants", () => {
  it("matches the portal bridge health row id", () => {
    const portalBridgeFile = fs.readFileSync(
      path.resolve(__dirname, "../../../src/lib/bridge.ts"),
      "utf8",
    );
    const uuidMatch = portalBridgeFile.match(
      /BRIDGE_HEALTH_ROW_ID\s*=\s*["']([^"']+)["']/,
    );

    expect(uuidMatch?.[1]).toBe(BRIDGE_HEALTH_ROW_ID);
  });
});
