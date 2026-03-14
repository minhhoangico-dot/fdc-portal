import { logger } from "./lib/logger";
import { startServer } from "./server";
import { startScheduler } from "./scheduler";
import { checkHisConnection, hisPool } from "./db/his";
import { checkMisaConnection, misaPool } from "./db/misa";
import { validateConfig } from "./config";

async function main(): Promise<void> {
  validateConfig();

  logger.info("Starting FDC LAN Bridge Service...");
  logger.info("Testing DB Connections...");

  const hisOk = await checkHisConnection();
  const misaOk = await checkMisaConnection();

  if (!hisOk) logger.warn("Initial HIS PostgreSQL connection failed");
  if (!misaOk) logger.warn("Initial MISA SQL Server connection failed");

  startServer();
  startScheduler();

  logger.info("FDC LAN Bridge Service is running successfully.");
}

const shutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  try {
    await hisPool.end();
    await misaPool.close();
    logger.info("Database pools closed.");
    process.exit(0);
  } catch (err) {
    logger.error("Error during shutdown", err);
    process.exit(1);
  }
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception", err);
});
process.on("unhandledRejection", (err) => {
  logger.error("Unhandled Rejection", err);
});

main().catch((err) => {
  logger.error("Fatal startup error", err);
  process.exit(1);
});

