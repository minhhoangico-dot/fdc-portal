/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BlockList, isIP } from "node:net";
import type { Request } from "express";
import { config, type TvAllowedNetwork, type TvAllowedSite } from "../config";
import { logger } from "../lib/logger";

export type TvAccessStatus =
  | "allowed_by_network"
  | "require_geolocation"
  | "deny_not_configured"
  | "deny";

export interface TvAccessCheckResult {
  status: TvAccessStatus;
  matchedNetwork: { key: string; label: string } | null;
  allowedSites: TvAllowedSite[];
  clientIp: string | null;
  reason: string | null;
}

type AddressFamily = "ipv4" | "ipv6";

function normalizeIp(candidate: string | null | undefined): string | null {
  if (!candidate) return null;

  let value = candidate.trim();
  if (!value) return null;

  if (value.includes(",")) {
    value = value.split(",")[0].trim();
  }

  const bracketMatch = value.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketMatch) {
    value = bracketMatch[1];
  }

  const ipv4PortMatch = value.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/);
  if (ipv4PortMatch) {
    value = ipv4PortMatch[1];
  }

  if (value.startsWith("::ffff:")) {
    value = value.slice(7);
  }

  return isIP(value) ? value : null;
}

function getHeaderValue(header: string | string[] | undefined): string | null {
  if (Array.isArray(header)) {
    return normalizeIp(header[0]);
  }

  return normalizeIp(header);
}

function getClientIp(req: Request): string | null {
  const cfConnectingIp = getHeaderValue(req.headers["cf-connecting-ip"]);
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  const forwardedFor = getHeaderValue(req.headers["x-forwarded-for"]);
  if (forwardedFor) {
    return forwardedFor;
  }

  return normalizeIp(req.ip || req.socket?.remoteAddress || null);
}

function getAddressFamily(ipAddress: string): AddressFamily | null {
  const family = isIP(ipAddress);
  if (family === 4) return "ipv4";
  if (family === 6) return "ipv6";
  return null;
}

function parseCidr(cidr: string): { address: string; prefix: number; family: AddressFamily } | null {
  const trimmed = cidr.trim();
  if (!trimmed) return null;

  const [rawAddress, rawPrefix] = trimmed.split("/", 2);
  const address = normalizeIp(rawAddress);
  if (!address) return null;

  const family = getAddressFamily(address);
  if (!family) return null;

  const defaultPrefix = family === "ipv4" ? 32 : 128;
  const prefix = rawPrefix ? Number(rawPrefix) : defaultPrefix;
  if (!Number.isInteger(prefix)) return null;

  if ((family === "ipv4" && (prefix < 0 || prefix > 32)) || (family === "ipv6" && (prefix < 0 || prefix > 128))) {
    return null;
  }

  return { address, prefix, family };
}

function findMatchingNetwork(
  clientIp: string,
  allowedNetworks: TvAllowedNetwork[],
): { key: string; label: string } | null {
  const family = getAddressFamily(clientIp);
  if (!family) return null;

  for (const network of allowedNetworks) {
    const blockList = new BlockList();

    for (const cidr of network.cidrs) {
      const parsed = parseCidr(cidr);
      if (!parsed || parsed.family !== family) {
        continue;
      }

      blockList.addSubnet(parsed.address, parsed.prefix, parsed.family);
    }

    if (blockList.check(clientIp, family)) {
      return { key: network.key, label: network.label };
    }
  }

  return null;
}

function buildResponse(
  status: TvAccessStatus,
  clientIp: string | null,
  matchedNetwork: { key: string; label: string } | null,
  reason: string | null,
): TvAccessCheckResult {
  return {
    status,
    matchedNetwork,
    allowedSites: config.tvAccess.allowedSites,
    clientIp,
    reason,
  };
}

export function getTvAccessCheck(req: Request): TvAccessCheckResult {
  const clientIp = getClientIp(req);
  const matchedNetwork = clientIp
    ? findMatchingNetwork(clientIp, config.tvAccess.allowedNetworks)
    : null;

  let response: TvAccessCheckResult;

  if (matchedNetwork) {
    response = buildResponse("allowed_by_network", clientIp, matchedNetwork, null);
  } else if (config.tvAccess.allowedSites.length > 0) {
    response = buildResponse("require_geolocation", clientIp, null, clientIp ? "ip_not_allowlisted" : "ip_unavailable");
  } else if (config.tvAccess.allowedNetworks.length === 0 && config.tvAccess.allowedSites.length === 0) {
    response = buildResponse("deny_not_configured", clientIp, null, "tv_access_not_configured");
  } else {
    response = buildResponse("deny", clientIp, null, "outside_allowed_networks");
  }

  logger.info("TV access check completed", {
    clientIp: response.clientIp,
    matchedNetwork: response.matchedNetwork?.key ?? null,
    status: response.status,
    reason: response.reason,
  });

  return response;
}
