export {};

const mockHisQuery = jest.fn();
const mockUpsert = jest.fn();
const mockInfo = jest.fn();
const mockError = jest.fn();
const mockLogSync = jest.fn();

jest.mock("../../src/db/his", () => ({
  hisPool: {
    query: (...args: any[]) => mockHisQuery(...args),
  },
}));

jest.mock("../../src/db/supabase", () => ({
  supabase: {
    from: () => ({
      upsert: (...args: any[]) => mockUpsert(...args),
    }),
  },
}));

jest.mock("../../src/lib/logger", () => ({
  logger: {
    info: (...args: any[]) => mockInfo(...args),
    error: (...args: any[]) => mockError(...args),
  },
}));

jest.mock("../../src/lib/syncLog", () => ({
  logSync: (...args: any[]) => mockLogSync(...args),
}));

describe("syncPatientVolumeJob", () => {
  beforeEach(() => {
    mockHisQuery.mockReset();
    mockUpsert.mockReset();
    mockInfo.mockReset();
    mockError.mockReset();
    mockLogSync.mockReset();

    mockHisQuery.mockResolvedValue({
      rows: [
        {
          report_date: "2026-03-09",
          total_treatments: "490",
        },
        {
          report_date: new Date("2026-03-13T00:00:00.000Z"),
          total_treatments: 303,
        },
      ],
    });
    mockUpsert.mockResolvedValue({ error: null });
    mockLogSync.mockResolvedValue(undefined);
  });

  it("backfills last-year daily patient volume instead of only syncing today", async () => {
    const { syncPatientVolumeJob } = await import("../../src/jobs/syncPatientVolume");

    await syncPatientVolumeJob();

    expect(mockHisQuery).toHaveBeenCalledWith(
      expect.stringContaining("CURRENT_DATE - INTERVAL '365 days'"),
    );
    expect(mockUpsert).toHaveBeenCalledWith(
      [
        {
          report_date: "2026-03-09",
          total_treatments: 490,
          new_patients: 98,
          returning_patients: 392,
        },
        {
          report_date: "2026-03-13",
          total_treatments: 303,
          new_patients: 60,
          returning_patients: 242,
        },
      ],
      { onConflict: "report_date" },
    );
    expect(mockError).not.toHaveBeenCalled();
  });
});
