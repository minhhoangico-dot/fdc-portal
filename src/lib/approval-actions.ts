/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function normalizeSelectionIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const id of ids) {
    const trimmedId = id.trim();
    if (!trimmedId || seen.has(trimmedId)) {
      continue;
    }

    seen.add(trimmedId);
    normalized.push(trimmedId);
  }

  return normalized;
}

export function assertNonEmptySelection(ids: string[]): string[] {
  if (ids.length === 0) {
    throw new Error('No approval requests selected.');
  }

  return ids;
}
