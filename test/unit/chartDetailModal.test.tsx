/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import ChartDetailModal from "../../src/app/inventory/ChartDetailModal";

test("renders optional summary, filters, and data note for KPI detail dialogs", () => {
  const markup = renderToStaticMarkup(
    <ChartDetailModal
      title="Tổng loại vật tư"
      dataSource="MISA"
      dataNote="Dữ liệu từ fdc_inventory_snapshots"
      summaryRows={[
        { label: "Vật tư y tế", value: "2 mã", tone: "default" },
        { label: "Văn phòng phẩm", value: "1 mã", tone: "warning" },
      ]}
      filters={<div>Bộ lọc KPI</div>}
      columns={["Mã", "Tên"]}
      rows={[["VT-001", "Gạc y tế"]]}
      onClose={() => undefined}
    />,
  );

  assert.match(markup, /Vật tư y tế/);
  assert.match(markup, /Bộ lọc KPI/);
  assert.match(markup, /fdc_inventory_snapshots/);
});
