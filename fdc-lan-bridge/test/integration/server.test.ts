import request from "supertest";

jest.mock("../../src/db/his", () => ({
  checkHisConnection: async () => true,
}));

jest.mock("../../src/db/misa", () => ({
  checkMisaConnection: async () => true,
}));

const maybeSingleMock = jest.fn(async () => ({
  data: {
    queue_depth: 0,
    last_heartbeat: "2026-03-14T01:17:00.746+00:00",
  },
  error: null,
}));
const eqMock = jest.fn(() => ({
  maybeSingle: maybeSingleMock,
}));
const selectMock = jest.fn(() => ({
  eq: eqMock,
}));

jest.mock("../../src/db/supabase", () => ({
  supabase: {
    from: () => ({
      select: selectMock,
    }),
  },
}));

jest.mock("../../src/jobs/syncInventory", () => ({
  syncInventoryJob: async () => undefined,
}));
jest.mock("../../src/jobs/detectAnomalies", () => ({
  detectAnomaliesJob: async () => undefined,
}));
jest.mock("../../src/jobs/syncPatientVolume", () => ({
  syncPatientVolumeJob: async () => undefined,
}));
jest.mock("../../src/jobs/syncMedicineImports", () => ({
  syncMedicineImportsJob: async () => undefined,
}));
jest.mock("../../src/jobs/syncSupplyMonthlyStats", () => ({
  syncSupplyMonthlyStatsJob: async () => undefined,
}));
jest.mock("../../src/jobs/syncMisaPayments", () => ({
  syncMisaPaymentsJob: async () => undefined,
}));
jest.mock("../../src/jobs/scanMisaPhieuchi", () => ({
  scanMisaPhieuchiJob: async () => undefined,
}));
const mockBackfillMisaInventorySnapshotsJob = jest.fn(async () => undefined);
jest.mock("../../src/jobs/syncMisaSupplies", () => ({
  syncMisaSuppliesJob: async () => undefined,
  backfillMisaInventorySnapshotsJob: mockBackfillMisaInventorySnapshotsJob,
}));
jest.mock("../../src/jobs/syncSupplyConsumption", () => ({
  syncSupplyConsumptionJob: async () => undefined,
}));
jest.mock("../../src/jobs/syncAttendance", () => ({
  syncAttendanceJob: async () => undefined,
}));

describe("server routes", () => {
  it("GET /health returns expected shape", async () => {
    const { app } = await import("../../src/server");
    const { BRIDGE_HEALTH_ROW_ID } = await import("../../src/lib/bridgeHealth");
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("hisConnected", true);
    expect(res.body).toHaveProperty("misaConnected", true);
    expect(res.body).toHaveProperty("queueDepth", 0);
    expect(res.body).toHaveProperty("lastHeartbeat", "2026-03-14T01:17:00.746+00:00");
    expect(eqMock).toHaveBeenCalledWith("id", BRIDGE_HEALTH_ROW_ID);
  });

  it("POST /sync/HIS returns ok", async () => {
    const { app } = await import("../../src/server");
    const res = await request(app).post("/sync/HIS");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("POST /sync/MISA returns ok", async () => {
    const { app } = await import("../../src/server");
    const res = await request(app).post("/sync/MISA");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("POST /sync/timekeeping returns ok", async () => {
    const { app } = await import("../../src/server");
    const res = await request(app).post("/sync/timekeeping");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("POST /sync/backfill-inventory returns ok", async () => {
    const { app } = await import("../../src/server");
    const res = await request(app).post("/sync/backfill-inventory?days=180");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, message: "Backfilling 180 days" });
    expect(mockBackfillMisaInventorySnapshotsJob).toHaveBeenCalledWith(180);
  });

  it("POST /sync/unknown returns 400", async () => {
    const { app } = await import("../../src/server");
    const res = await request(app).post("/sync/unknown");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ ok: false, error: "Unknown sync type" });
  });
});

