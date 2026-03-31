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

export interface TvAllowedNetwork {
  key: string;
  label: string;
  cidrs: string[];
}

export interface TvAllowedSite {
  key: string;
  label: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface TvAccessConfig {
  allowedNetworks: TvAllowedNetwork[];
  allowedSites: TvAllowedSite[];
}

export interface AppConfig {
  port: number;
  supabase: SupabaseConfig;
  his: HisConfig;
  misa: MisaConfig;
  tvAccess: TvAccessConfig;
}

function parseJsonEnv<T>(name: string, fallback: T): T {
  const raw = process.env[name];
  if (!raw?.trim()) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    // eslint-disable-next-line no-console
    console.warn(`Invalid JSON in ${name}. Falling back to defaults.`);
    return fallback;
  }
}

function parseTvAllowedNetworks(): TvAllowedNetwork[] {
  const parsed = parseJsonEnv<unknown[]>("TV_ALLOWED_NETWORKS", []);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const entry = item as Record<string, unknown>;
    const key = typeof entry.key === "string" ? entry.key.trim() : "";
    const label = typeof entry.label === "string" ? entry.label.trim() : "";
    const cidrs = Array.isArray(entry.cidrs)
      ? entry.cidrs.filter((cidr): cidr is string => typeof cidr === "string" && cidr.trim().length > 0)
      : [];

    if (!key || !label || cidrs.length === 0) {
      return [];
    }

    return [{ key, label, cidrs }];
  });
}

function parseTvAllowedSites(): TvAllowedSite[] {
  const parsed = parseJsonEnv<unknown[]>("TV_ALLOWED_SITES", []);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const entry = item as Record<string, unknown>;
    const key = typeof entry.key === "string" ? entry.key.trim() : "";
    const label = typeof entry.label === "string" ? entry.label.trim() : "";
    const latitude = Number(entry.latitude);
    const longitude = Number(entry.longitude);
    const radiusMeters = Number(entry.radiusMeters);

    if (
      !key ||
      !label ||
      Number.isNaN(latitude) ||
      Number.isNaN(longitude) ||
      Number.isNaN(radiusMeters) ||
      radiusMeters <= 0
    ) {
      return [];
    }

    return [{ key, label, latitude, longitude, radiusMeters }];
  });
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
  tvAccess: {
    allowedNetworks: parseTvAllowedNetworks(),
    allowedSites: parseTvAllowedSites(),
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

