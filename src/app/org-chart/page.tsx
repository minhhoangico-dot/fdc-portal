/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GitBranch } from "lucide-react";

import { OrgChartTree } from "@/components/org-chart/OrgChartTree";
import { ORG_CHART_ROOT } from "@/lib/org-chart-data";

export default function OrgChartPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <GitBranch className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">So do to chuc</h1>
          <p className="text-sm text-gray-500">Cau truc to chuc va vai tro tai phong kham</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-6 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-indigo-50 border-2 border-indigo-300" />
            <span className="text-xs text-gray-600">Ban lanh dao</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-50 border-2 border-amber-300" />
            <span className="text-xs text-gray-600">Truong phong / bo phan</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-white border-2 border-gray-200" />
            <span className="text-xs text-gray-600">Nhan vien</span>
          </div>
        </div>

        <OrgChartTree root={ORG_CHART_ROOT} />
      </div>
    </div>
  );
}
