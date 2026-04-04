/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Role } from "@/types/user";

export interface OrgChartNode {
  roleKey: Role;
  children: OrgChartNode[];
}

export const ORG_CHART_ROOT: OrgChartNode = {
  roleKey: "chairman",
  children: [
    {
      roleKey: "director",
      children: [
        {
          roleKey: "super_admin",
          children: [
            {
              roleKey: "accountant",
              children: [{ roleKey: "internal_accountant", children: [] }],
            },
          ],
        },
        {
          roleKey: "head_nurse",
          children: [{ roleKey: "clinic_staff", children: [] }],
        },
        {
          roleKey: "business_head",
          children: [{ roleKey: "business_staff", children: [] }],
        },
        {
          roleKey: "pharmacy_head",
          children: [{ roleKey: "pharmacy_staff", children: [] }],
        },
        {
          roleKey: "lab_head",
          children: [{ roleKey: "lab_staff", children: [] }],
        },
      ],
    },
  ],
};
