import dotenv from "dotenv";

dotenv.config();

export interface SupabaseConfig {
  url: string;
  serviceRoleKey: string;
}

export interface HisConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export interface MisaConfig {
  server: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export interface AppConfig {
  port: number;
  supabase: SupabaseConfig;
  his: HisConfig;
  misa: MisaConfig;
}

export const config: AppConfig = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3333,
  supabase: {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  },
  his: {
    host: process.env.HIS_DB_HOST || "",
    port: process.env.HIS_DB_PORT ? parseInt(process.env.HIS_DB_PORT, 10) : 0,
    database: process.env.HIS_DB_NAME || "",
    user: process.env.HIS_DB_USER || "",
    password: process.env.HIS_DB_PASSWORD || "",
  },
  misa: {
    server: process.env.MISA_DB_SERVER || "",
    port: process.env.MISA_DB_PORT ? parseInt(process.env.MISA_DB_PORT, 10) : 0,
    database: process.env.MISA_DB_NAME || "",
    user: process.env.MISA_DB_USER || "",
    password: process.env.MISA_DB_PASSWORD || "",
  },
};

export function validateConfig(): void {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) {
    // eslint-disable-next-line no-console
    console.warn(
      "Missing Supabase credentials in environment. Supabase client will not work correctly.",
    );
  }
}

