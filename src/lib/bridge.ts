// IMPORTANT: This value must match fdc-lan-bridge/src/lib/bridgeHealth.ts in the bridge project.
export const BRIDGE_HEALTH_ROW_ID = 'b45a9096-7c91-4cf5-9cd8-89c0966a3371';
export const BRIDGE_HEARTBEAT_STALE_AFTER_MS = 3 * 60 * 1000;

export function isBridgeHeartbeatStale(
  lastHeartbeat?: string | null,
  now = Date.now(),
): boolean {
  if (!lastHeartbeat) return true;

  const parsedHeartbeat = Date.parse(lastHeartbeat);
  if (Number.isNaN(parsedHeartbeat)) return true;

  return now - parsedHeartbeat > BRIDGE_HEARTBEAT_STALE_AFTER_MS;
}
