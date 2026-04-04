/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ValuationModule = "pharmacy" | "inventory";
export type ResolvedValuationModule = ValuationModule | "chooser";

export const resolveValuationModule = (
  value: string | null | undefined,
): ResolvedValuationModule => {
  if (value === "pharmacy" || value === "inventory") {
    return value;
  }

  return "chooser";
};

export const supportsValuationImportHistory = (
  module: ResolvedValuationModule,
): module is "pharmacy" => module === "pharmacy";
