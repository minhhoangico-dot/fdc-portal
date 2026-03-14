jest.mock("../../src/db/supabase", () => {
  return {
    supabase: {
      from: () => ({
        insert: async () => ({ error: null }),
      }),
    },
  };
});

describe("logSync", () => {
  it("writes a sync log without throwing", async () => {
    const { logSync } = await import("../../src/lib/syncLog");
    await expect(
      logSync("syncTest", "completed", "SYSTEM", 1, null, 100),
    ).resolves.toBeUndefined();
  });
});

