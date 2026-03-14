import mssql, { ConnectionPool } from "mssql";
import { config } from "../config";
import { logger } from "../lib/logger";

const sqlConfig: mssql.config = {
  user: config.misa.user,
  password: config.misa.password,
  database: config.misa.database,
  server: config.misa.server,
  port: config.misa.port,
  pool: {
    max: 3,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

export const misaPool: ConnectionPool = new mssql.ConnectionPool(sqlConfig);

misaPool.on("error", (err) => {
  logger.error("MISA SQL Server pool error", err);
});

export const checkMisaConnection = async (): Promise<boolean> => {
  try {
    if (!misaPool.connected) {
      await misaPool.connect();
    }
    await misaPool.request().query("SELECT 1 as test");
    return true;
  } catch (err) {
    logger.error("Failed to connect to MISA SQL Server", err);
    return false;
  }
};

