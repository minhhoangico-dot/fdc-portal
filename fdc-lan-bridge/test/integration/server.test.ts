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

jest.mock("../../src/jobs/syncSupplyInward", () => ({
  syncSupplyInwardJob: async () => undefined,
}));

jest.mock("../../src/jobs/syncAttendance", () => ({
  syncAttendanceJob: async () => undefined,
}));

const mockGetCurrentWeeklyReport = jest.fn(async () => ({
  meta: {
    generated_at: "2026-03-19T02:00:00.000Z",
    week_start: "2026-03-16T00:00:00.000Z",
    week_end: "2026-03-22T23:59:59.999Z",
    week_number: 12,
    year: 2026,
    source: "snapshot",
  },
  data: {
    examination: [],
    laboratory: [],
    imaging: [],
    specialist: [],
    infectious: [],
    transfer: [],
  },
}));

const mockGetWeeklyReportStatus = jest.fn(async () => ({
  week: {
    year: 2026,
    week_number: 12,
    week_start: "2026-03-16T00:00:00.000Z",
    week_end: "2026-03-22T23:59:59.999Z",
  },
  snapshot: {
    id: "snapshot-1",
    generated_at: "2026-03-19T02:00:00.000Z",
  },
  latest_log: {
    id: "log-1",
    action_type: "GENERATE",
    started_at: "2026-03-19T02:00:00.000Z",
    completed_at: "2026-03-19T02:01:00.000Z",
    status: "SUCCESS",
    details: null,
    error_message: null,
  },
}));

const mockGenerateWeeklyReportSnapshot = jest.fn(async () => ({
  meta: {
    generated_at: "2026-03-19T02:30:00.000Z",
    week_start: "2026-03-16T00:00:00.000Z",
    week_end: "2026-03-22T23:59:59.999Z",
    week_number: 12,
    year: 2026,
  },
  data: {
    examination: [],
    laboratory: [],
    imaging: [],
    specialist: [],
    infectious: [],
    transfer: [],
  },
}));

const mockGetWeeklyReportCustomReport = jest.fn(async () => ({
  meta: {
    generated_at: "2026-03-19T03:00:00.000Z",
    week_start: "2026-03-16T00:00:00.000Z",
    week_end: "2026-03-22T23:59:59.999Z",
    week_number: 12,
    year: 2026,
  },
  data: {
    examination: [{ key: "kham_nhi_tw", name: "Khám Nhi", current: 10, previous: 8, is_bhyt: false }],
  },
}));

const mockGetWeeklyReportDetailRows = jest.fn(async () => [
  {
    servicedataid: 1,
    patientcode: "BN001",
    patientname: "Nguyen Van A",
    time: "19/03/2026 09:00",
  },
]);

const mockListWeeklyReportInfectiousCodeSettings = jest.fn(async () => [
  {
    id: "code-1",
    icd_code: "J10",
    icd_pattern: "J10%",
    disease_name_vi: "Cúm",
    disease_group: "cum",
    color_code: "#3B82F6",
    is_active: true,
    display_order: 1,
  },
]);

const mockCreateWeeklyReportInfectiousCodeSetting = jest.fn(async (payload) => ({
  id: "code-2",
  ...payload,
}));

const mockUpdateWeeklyReportInfectiousCodeSetting = jest.fn(async (id, payload) => ({
  id,
  ...payload,
}));

const mockDeleteWeeklyReportInfectiousCodeSetting = jest.fn(async () => undefined);

const mockListWeeklyReportServiceMappingSettings = jest.fn(async () => [
  {
    id: "mapping-1",
    category_key: "kham_nhi_tw",
    category_name_vi: "Khám Nhi",
    display_group: "kham_benh",
    match_type: "contains",
    match_value: "Nhi TW",
    is_active: true,
    display_order: 1,
  },
]);

const mockCreateWeeklyReportServiceMappingSetting = jest.fn(async (payload) => ({
  id: "mapping-2",
  ...payload,
}));

const mockUpdateWeeklyReportServiceMappingSetting = jest.fn(async (id, payload) => ({
  id,
  ...payload,
}));

const mockDeleteWeeklyReportServiceMappingSetting = jest.fn(async () => undefined);

const mockSearchWeeklyReportServiceCatalogByTerm = jest.fn(async () => [
  {
    servicename: "Khám Nhi TW",
    dm_servicegroupid: 1,
    dm_servicesubgroupid: 101,
  },
]);

jest.mock("../../src/weeklyReport/service", () => ({
  getCurrentWeeklyReport: mockGetCurrentWeeklyReport,
  getWeeklyReportStatus: mockGetWeeklyReportStatus,
  generateWeeklyReportSnapshot: mockGenerateWeeklyReportSnapshot,
  getWeeklyReportCustomReport: mockGetWeeklyReportCustomReport,
  getWeeklyReportDetailRows: mockGetWeeklyReportDetailRows,
  listWeeklyReportInfectiousCodeSettings: mockListWeeklyReportInfectiousCodeSettings,
  createWeeklyReportInfectiousCodeSetting: mockCreateWeeklyReportInfectiousCodeSetting,
  updateWeeklyReportInfectiousCodeSetting: mockUpdateWeeklyReportInfectiousCodeSetting,
  deleteWeeklyReportInfectiousCodeSetting: mockDeleteWeeklyReportInfectiousCodeSetting,
  listWeeklyReportServiceMappingSettings: mockListWeeklyReportServiceMappingSettings,
  createWeeklyReportServiceMappingSetting: mockCreateWeeklyReportServiceMappingSetting,
  updateWeeklyReportServiceMappingSetting: mockUpdateWeeklyReportServiceMappingSetting,
  deleteWeeklyReportServiceMappingSetting: mockDeleteWeeklyReportServiceMappingSetting,
  searchWeeklyReportServiceCatalogByTerm: mockSearchWeeklyReportServiceCatalogByTerm,
}));

describe("server routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ maybeSingle: maybeSingleMock });
    maybeSingleMock.mockResolvedValue({
      data: {
        queue_depth: 0,
        last_heartbeat: "2026-03-14T01:17:00.746+00:00",
      },
      error: null,
    });
  });

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

  it("GET /weekly-report/current returns cached report payload", async () => {
    const { app } = await import("../../src/server");
    const res = await request(app).get("/weekly-report/current").query({ date: "2026-03-19T00:00:00.000Z" });

    expect(res.status).toBe(200);
    expect(res.body.meta.week_number).toBe(12);
    expect(mockGetCurrentWeeklyReport).toHaveBeenCalledWith({ date: "2026-03-19T00:00:00.000Z" });
  });

  it("GET /weekly-report/status returns module status", async () => {
    const { app } = await import("../../src/server");
    const res = await request(app).get("/weekly-report/status").query({ date: "2026-03-19T00:00:00.000Z" });

    expect(res.status).toBe(200);
    expect(res.body.snapshot.id).toBe("snapshot-1");
    expect(mockGetWeeklyReportStatus).toHaveBeenCalledWith("2026-03-19T00:00:00.000Z");
  });

  it("POST /weekly-report/generate triggers manual snapshot generation", async () => {
    const { app } = await import("../../src/server");
    const res = await request(app)
      .post("/weekly-report/generate")
      .send({ date: "2026-03-19T00:00:00.000Z" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      week_number: 12,
      year: 2026,
      generated_at: "2026-03-19T02:30:00.000Z",
    });
    expect(mockGenerateWeeklyReportSnapshot).toHaveBeenCalledWith({
      date: "2026-03-19T00:00:00.000Z",
      trigger: "manual",
    });
  });

  it("POST /weekly-report/custom validates required payload", async () => {
    const { app } = await import("../../src/server");
    const res = await request(app).post("/weekly-report/custom").send({ indicators: [] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Missing custom report payload" });
  });

  it("POST /weekly-report/custom returns custom report", async () => {
    const { app } = await import("../../src/server");
    const res = await request(app).post("/weekly-report/custom").send({
      indicators: ["examination"],
      startDate: "2026-03-01",
      endDate: "2026-03-19",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.examination).toHaveLength(1);
    expect(mockGetWeeklyReportCustomReport).toHaveBeenCalledWith({
      indicators: ["examination"],
      startDate: "2026-03-01",
      endDate: "2026-03-19",
    });
  });

  it("GET /weekly-report/details validates required query params", async () => {
    const { app } = await import("../../src/server");
    const res = await request(app).get("/weekly-report/details").query({ key: "kham_nhi_tw" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Missing detail parameters" });
  });

  it("GET /weekly-report/details returns detail rows", async () => {
    const { app } = await import("../../src/server");
    const res = await request(app).get("/weekly-report/details").query({
      key: "kham_nhi_tw",
      type: "examination",
      start: "2026-03-16T00:00:00.000Z",
      end: "2026-03-22T23:59:59.999Z",
    });

    expect(res.status).toBe(200);
    expect(res.body[0].patientcode).toBe("BN001");
    expect(mockGetWeeklyReportDetailRows).toHaveBeenCalledWith({
      key: "kham_nhi_tw",
      type: "examination",
      start: "2026-03-16T00:00:00.000Z",
      end: "2026-03-22T23:59:59.999Z",
    });
  });

  it("GET /weekly-report/settings/icd-codes returns settings list", async () => {
    const { app } = await import("../../src/server");
    const res = await request(app).get("/weekly-report/settings/icd-codes");

    expect(res.status).toBe(200);
    expect(res.body[0].icd_code).toBe("J10");
  });

  it("GET /weekly-report/settings/service-catalog returns catalog search results", async () => {
    const { app } = await import("../../src/server");
    const res = await request(app).get("/weekly-report/settings/service-catalog").query({ q: "Nhi" });

    expect(res.status).toBe(200);
    expect(res.body[0].servicename).toBe("Khám Nhi TW");
    expect(mockSearchWeeklyReportServiceCatalogByTerm).toHaveBeenCalledWith("Nhi");
  });
});
