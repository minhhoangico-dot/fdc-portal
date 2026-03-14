describe("config.validateConfig", () => {
  it("does not throw when missing env", async () => {
    jest.resetModules();
    process.env.SUPABASE_URL = "";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "";

    const mod = await import("../../src/config");
    expect(() => mod.validateConfig()).not.toThrow();
  });
});

