/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRoleCatalog } from "@/contexts/RoleCatalogContext";
import type { OrgChartNode } from "@/lib/org-chart-data";
import { cn } from "@/lib/utils";

function OrgChartNodeCard({ node }: { node: OrgChartNode }) {
  const { getRoleLabel } = useRoleCatalog();
  const label = getRoleLabel(node.roleKey);

  const isLeadership = ["chairman", "director"].includes(node.roleKey);
  const isHead = [
    "super_admin",
    "head_nurse",
    "business_head",
    "pharmacy_head",
    "lab_head",
  ].includes(node.roleKey);

  return (
    <div
      className={cn(
        "inline-flex flex-col items-center px-4 py-3 rounded-xl border-2 shadow-sm min-w-[140px] transition-colors",
        isLeadership && "bg-indigo-50 border-indigo-300 text-indigo-900",
        isHead && "bg-amber-50 border-amber-300 text-amber-900",
        !isLeadership && !isHead && "bg-white border-gray-200 text-gray-700",
      )}
    >
      <span
        className={cn(
          "text-sm font-semibold leading-tight text-center",
          isLeadership && "text-indigo-800",
          isHead && "text-amber-800",
          !isLeadership && !isHead && "text-gray-800",
        )}
      >
        {label}
      </span>
      <span className="text-[11px] text-gray-400 mt-0.5 font-mono">{node.roleKey}</span>
    </div>
  );
}

function OrgChartBranch({ node }: { node: OrgChartNode; key?: string }) {
  const hasChildren = node.children.length > 0;

  return (
    <li className="flex flex-col items-center relative">
      <div className="w-px h-5 bg-gray-300" />

      <OrgChartNodeCard node={node} />

      {hasChildren && (
        <>
          <div className="w-px h-5 bg-gray-300" />

          {node.children.length > 1 && (
            <div className="relative w-full">
              <div
                className="absolute top-0 h-px bg-gray-300"
                style={{
                  left: `${100 / (2 * node.children.length)}%`,
                  right: `${100 / (2 * node.children.length)}%`,
                }}
              />
            </div>
          )}

          <ul className="flex gap-2 justify-center">
            {node.children.map((child) => (
              <OrgChartBranch key={child.roleKey} node={child} />
            ))}
          </ul>
        </>
      )}
    </li>
  );
}

export function OrgChartTree({ root }: { root: OrgChartNode }) {
  return (
    <div className="overflow-x-auto py-6">
      <ul className="flex justify-center min-w-max">
        <li className="flex flex-col items-center">
          <OrgChartNodeCard node={root} />

          {root.children.length > 0 && (
            <>
              <div className="w-px h-5 bg-gray-300" />

              {root.children.length > 1 && (
                <div className="relative w-full">
                  <div
                    className="absolute top-0 h-px bg-gray-300"
                    style={{
                      left: `${100 / (2 * root.children.length)}%`,
                      right: `${100 / (2 * root.children.length)}%`,
                    }}
                  />
                </div>
              )}

              <ul className="flex gap-2 justify-center">
                {root.children.map((child) => (
                  <OrgChartBranch key={child.roleKey} node={child} />
                ))}
              </ul>
            </>
          )}
        </li>
      </ul>
    </div>
  );
}
