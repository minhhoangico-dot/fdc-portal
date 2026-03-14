const mockCheckHisConnection = jest.fn();
const mockCheckMisaConnection = jest.fn();
const mockUpsert = jest.fn();
const mockInfo = jest.fn();
const mockError = jest.fn();

jest.mock("../../src/db/his", () => ({
  checkHisConnection: () => mockCheckHisConnection(),
}));

jest.mock("../../src/db/misa", () => ({
  checkMisaConnection: () => mockCheckMisaConnection(),
}));

jest.mock("../../src/db/supabase", () => ({
  supabase: {
    from: () => ({
      upsert: mockUpsert,
    }),
  },
}));

jest.mock("../../src/lib/logger", () => ({
  logger: {
    info: mockInfo,
    error: mockError,
  },
}));

describe("updateHealthJob", () => {
  beforeEach(() => {
    mockCheckHisConnection.mockReset();
    mockCheckMisaConnection.mockReset();
    mockUpsert.mockReset();
    mockInfo.mockReset();
    mockError.mockReset();

    mockCheckHisConnection.mockResolvedValue(true);
    mockCheckMisaConnection.mockResolvedValue(false);
    mockUpsert.mockResolvedValue({ error: null, status: 201 });
  });

  it("upserts degraded status when one DB down", async () => {
    const { updateHealthJob } = await import("../../src/jobs/updateHealth");
    const { BRIDGE_HEALTH_ROW_ID } = await import("../../src/lib/bridgeHealth");

    await updateHealthJob();

    expect(mockUpsert).toHaveBeenCalled();
    const calls = mockUpsert.mock.calls as any[];
    expect(calls.length).toBeGreaterThan(0);
    const payload = calls[0]?.[0];
    expect(payload.id).toBe(BRIDGE_HEALTH_ROW_ID);
    expect(payload.bridge_status).toBe("degraded");
    expect(mockInfo).toHaveBeenCalledWith(
      "Health heartbeat updated: degraded (HIS=true, MISA=false)",
    );
    expect(mockError).not.toHaveBeenCalled();
  });

  it("keeps degraded status when both DBs are down", async () => {
    const { updateHealthJob } = await import("../../src/jobs/updateHealth");

    mockCheckHisConnection.mockResolvedValue(false);
    mockCheckMisaConnection.mockResolvedValue(false);

    await updateHealthJob();

    const payload = (mockUpsert.mock.calls as any[])[0]?.[0];
    expect(payload.bridge_status).toBe("degraded");
    expect(payload.his_connected).toBe(false);
    expect(payload.misa_connected).toBe(false);
    expect(mockInfo).toHaveBeenCalledWith(
      "Health heartbeat updated: degraded (HIS=false, MISA=false)",
    );
  });

  it("logs detailed errors when the heartbeat upsert fails", async () => {
    const { updateHealthJob } = await import("../../src/jobs/updateHealth");

    mockUpsert.mockResolvedValue({
      error: {
        message: "connection refused",
        code: "PGRST301",
        details: "dial tcp refused",
        hint: "retry later",
      },
      status: 503,
    });

    await updateHealthJob();

    expect(mockError).toHaveBeenCalledWith(
      "Failed to update fdc_sync_health heartbeat: connection refused",
      {
        code: "PGRST301",
        details: "dial tcp refused",
        hint: "retry later",
        status: 503,
      },
    );
    expect(mockInfo).not.toHaveBeenCalled();
  });
});
