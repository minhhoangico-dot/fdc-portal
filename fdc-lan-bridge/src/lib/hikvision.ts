import { createHash, randomBytes } from "crypto";
import { logger } from "./logger";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { parseStringPromise } from "xml2js";

dayjs.extend(utc);
dayjs.extend(timezone);

const HIKVISION_HOST = process.env.HIKVISION_HOST || "";
const HIKVISION_USERNAME = process.env.HIKVISION_USERNAME || "admin";
const HIKVISION_PASSWORD = process.env.HIKVISION_PASSWORD || "";

interface DigestChallenge {
  realm: string;
  nonce: string;
  qop?: string;
  opaque?: string;
}

export function toHikvisionFormat(date: Date): string {
  return dayjs(date).tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DDTHH:mm:ssZ");
}

function md5(input: string): string {
  return createHash("md5").update(input).digest("hex");
}

function parseDigestChallenge(header: string): DigestChallenge {
  if (!/^Digest\s+/i.test(header)) {
    throw new Error("Hikvision did not return a Digest authentication challenge.");
  }

  const values: Record<string, string> = {};
  const digestHeader = header.replace(/^Digest\s+/i, "");
  const matches = digestHeader.matchAll(/([a-z0-9_-]+)=("([^"]*)"|([^,]+))/gi);

  for (const match of matches) {
    const key = match[1]?.toLowerCase();
    const value = match[3] ?? match[4];
    if (key && value) {
      values[key] = value.trim();
    }
  }

  if (!values.realm || !values.nonce) {
    throw new Error("Incomplete Hikvision Digest authentication challenge.");
  }

  return {
    realm: values.realm,
    nonce: values.nonce,
    qop: values.qop,
    opaque: values.opaque,
  };
}

function resolveQop(qop?: string): string | undefined {
  if (!qop) return undefined;

  const qopValues = qop
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (qopValues.includes("auth")) {
    return "auth";
  }

  return qopValues[0];
}

function buildDigestAuthorization(
  challenge: DigestChallenge,
  method: string,
  uri: string,
): string {
  const ha1 = md5(`${HIKVISION_USERNAME}:${challenge.realm}:${HIKVISION_PASSWORD}`);
  const ha2 = md5(`${method}:${uri}`);
  const qop = resolveQop(challenge.qop);

  const parts = [
    `username="${HIKVISION_USERNAME}"`,
    `realm="${challenge.realm}"`,
    `nonce="${challenge.nonce}"`,
    `uri="${uri}"`,
  ];

  if (qop) {
    const nc = "00000001";
    const cnonce = randomBytes(8).toString("hex");
    const response = md5(`${ha1}:${challenge.nonce}:${nc}:${cnonce}:${qop}:${ha2}`);

    parts.push(`algorithm=MD5`);
    parts.push(`response="${response}"`);
    parts.push(`qop=${qop}`);
    parts.push(`nc=${nc}`);
    parts.push(`cnonce="${cnonce}"`);
  } else {
    const response = md5(`${ha1}:${challenge.nonce}:${ha2}`);
    parts.push(`algorithm=MD5`);
    parts.push(`response="${response}"`);
  }

  if (challenge.opaque) {
    parts.push(`opaque="${challenge.opaque}"`);
  }

  return `Digest ${parts.join(", ")}`;
}

function buildRequestHeaders(headers?: HeadersInit): Headers {
  const requestHeaders = new Headers(headers);
  if (!requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }
  return requestHeaders;
}

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithDigestAuth(url: string, options: RequestInit): Promise<Response> {
  const method = (options.method || "GET").toUpperCase();
  const initialHeaders = buildRequestHeaders(options.headers);
  const initialResponse = await fetchWithTimeout(url, {
    ...options,
    method,
    headers: initialHeaders,
  });

  if (initialResponse.status !== 401) {
    return initialResponse;
  }

  const authenticateHeader = initialResponse.headers.get("www-authenticate");
  if (!authenticateHeader) {
    throw new Error("Hikvision returned 401 without a WWW-Authenticate header.");
  }

  const challenge = parseDigestChallenge(authenticateHeader);
  const requestUrl = new URL(url);
  const uri = `${requestUrl.pathname}${requestUrl.search}`;
  const authHeaders = buildRequestHeaders(options.headers);
  authHeaders.set(
    "Authorization",
    buildDigestAuthorization(challenge, method, uri),
  );

  return fetchWithTimeout(url, {
    ...options,
    method,
    headers: authHeaders,
  });
}

async function request(
  endpoint: string,
  options: RequestInit = {},
  retries = 3,
): Promise<Response> {
  const url = `http://${HIKVISION_HOST}${endpoint}`;
  if (!HIKVISION_HOST || !HIKVISION_PASSWORD) {
    throw new Error(
      "Hikvision credentials not configured in environment variables.",
    );
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithDigestAuth(url, options);
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(
          `HTTP ${response.status} ${response.statusText} - ${text}`,
        );
      }
      return response;
    } catch (error) {
      if (attempt === retries) {
        logger.error(
          `Hikvision request failed after ${retries} attempts: ${url}`,
          error,
        );
        throw error;
      }
      logger.warn(
        `Hikvision request attempt ${attempt} failed. Retrying in 2s...`,
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  throw new Error("Impossible execution path");
}

export async function checkConnection(): Promise<{
  online: boolean;
  model?: string;
  deviceName?: string;
  serialNumber?: string;
  error?: string;
}> {
  try {
    const response = await request("/ISAPI/System/deviceInfo", {
      method: "GET",
    });
    const xml = await response.text();
    const result: any = await parseStringPromise(xml);
    const deviceInfo = result.DeviceInfo;
    return {
      online: true,
      model: deviceInfo?.model?.[0] || "Unknown",
      deviceName: deviceInfo?.deviceName?.[0] || "Unknown",
      serialNumber: deviceInfo?.serialNumber?.[0] || "Unknown",
    };
  } catch (error: any) {
    return { online: false, error: error.message };
  }
}

async function searchAttendanceEvents(
  startTime: string,
  endTime: string,
  position = 0,
  maxResults = 30,
): Promise<any> {
  const body = {
    AcsEventCond: {
      searchID: String(Date.now()),
      searchResultPosition: position,
      maxResults,
      major: 5,
      minor: 0,
      startTime,
      endTime,
    },
  };
  const response = await request(
    "/ISAPI/AccessControl/AcsEvent?format=json",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
  return response.json();
}

export interface HikvisionEvent {
  eventId: string;
  employeeNo: string;
  name: string;
  cardNo: string;
  eventTime: string;
  doorName: string;
  eventType: number;
  attendanceStatus: string;
}

export async function getAllEvents(
  startDate: Date,
  endDate: Date,
): Promise<HikvisionEvent[]> {
  const startTimeStr = toHikvisionFormat(startDate);
  const endTimeStr = toHikvisionFormat(endDate);
  const events: HikvisionEvent[] = [];
  let position = 0;
  const batchSize = 30;
  let hasMore = true;

  logger.info(`Fetching Hikvision events from ${startTimeStr} to ${endTimeStr}`);

  while (hasMore) {
    const result = await searchAttendanceEvents(
      startTimeStr,
      endTimeStr,
      position,
      batchSize,
    );
    const acsEvent = result.AcsEvent || {};

    if (acsEvent.InfoList && Array.isArray(acsEvent.InfoList)) {
      for (const event of acsEvent.InfoList) {
        const eventTime = dayjs(event.time)
          .tz("Asia/Ho_Chi_Minh")
          .format("YYYY-MM-DD HH:mm:ssZ");
        events.push({
          eventId: `${event.employeeNoString}_${event.time}`,
          employeeNo: event.employeeNoString || "",
          name: event.name || "",
          cardNo: event.cardNo || "",
          eventTime,
          doorName: event.doorName || "",
          eventType: event.eventType || 0,
          attendanceStatus: event.attendanceStatus || "",
        });
      }
    }

    const total = acsEvent.totalMatches || 0;
    const numReceived = acsEvent.numOfMatches || 0;
    position += batchSize;

    if (position >= total && total > 0) {
      hasMore = false;
    } else if (numReceived === 0) {
      hasMore = false;
    }
  }

  return events;
}
