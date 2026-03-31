# Plan: Add Voucher-Level Supply Sync (fdc_supply_voucher_lines)

> **For**: Codex on Ubuntu server (`hbminh@vostro3470`) + Windows dev machine
>
> **Context**: The portal's Import/Export tab (`src/app/inventory/ImportExportTab.tsx`) has been redesigned to show individual vouchers with supplier info. The frontend already reads from `fdc_supply_voucher_lines` and falls back to the existing daily aggregate tables when the new table is empty. This plan creates the Supabase table and bridge sync job to populate it.
>
> **Conventions**: Use `@/` path alias for portal code. Bridge code is in `fdc-lan-bridge/`. Do not change any portal UI code — only bridge + SQL.

---

## Task 1: Explore MISA InventoryLedger columns

**Problem**: We currently query only a subset of InventoryLedger columns. We need to discover which columns provide voucher numbers and supplier/contact info.

**Action**: Run an exploratory SQL query against the MISA database to list available columns.

### Steps:

**1. Create `fdc-lan-bridge/src/jobs/exploreMisa.ts`** (temporary, delete after exploration)

```typescript
import mssql from "mssql";
import { misaPool } from "../db/misa";
import { logger } from "../lib/logger";

export async function exploreMisaSchema(): Promise<void> {
  if (!misaPool.connected) await misaPool.connect();
  const request = new mssql.Request(misaPool);

  // List all columns in InventoryLedger
  const cols = await request.query(`
    SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'InventoryLedger'
    ORDER BY ORDINAL_POSITION
  `);
  logger.info("InventoryLedger columns:");
  for (const col of cols.recordset) {
    logger.info(`  ${col.COLUMN_NAME} (${col.DATA_TYPE}${col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : ""})`);
  }

  // Sample 5 inward rows with all columns
  const sample = await request.query(`
    SELECT TOP 5 *
    FROM InventoryLedger
    WHERE AccountNumber LIKE '152%' AND InwardQuantity > 0
    ORDER BY RefDate DESC
  `);
  logger.info("Sample inward rows:");
  for (const row of sample.recordset) {
    logger.info(JSON.stringify(row, null, 2));
  }

  // Check for supplier/contact related tables
  const tables = await request.query(`
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_NAME LIKE '%Account%' OR TABLE_NAME LIKE '%Contact%' OR TABLE_NAME LIKE '%Object%' OR TABLE_NAME LIKE '%Supplier%' OR TABLE_NAME LIKE '%Vendor%'
    ORDER BY TABLE_NAME
  `);
  logger.info("Possible supplier tables:");
  for (const t of tables.recordset) {
    logger.info(`  ${t.TABLE_NAME}`);
  }
}
```

**2. Add a temporary endpoint to `fdc-lan-bridge/src/server.ts`**

In the `POST /sync/:type` switch, add a case:

```typescript
case "explore-misa": {
  void exploreMisaSchema();
  return res.json({ ok: true, message: "Check bridge logs for schema info" });
}
```

Import it: `import { exploreMisaSchema } from "./jobs/exploreMisa";`

**3. Run it**

```bash
cd /opt/fdc-lan-bridge
npm run build && sudo systemctl restart fdc-lan-bridge
curl -X POST http://localhost:3333/sync/explore-misa
sudo journalctl -u fdc-lan-bridge -n 200 --no-pager
```

**4. Record findings**

From the logs, identify:
- The column for voucher/reference number (likely `RefNo`)
- The column for supplier/contact info (likely `ContactName`, `ObjectName`, or similar)
- The column for description/memo (likely `JournalMemo` or `Description`)
- The column for unit of measurement (likely via a JOIN with `Unit` table)
- The column for unit price (likely `UnitPrice` or calculated from Amount/Qty)

**5. Clean up**: Delete `exploreMisa.ts` and remove the endpoint from `server.ts` after recording the column names.

### Verification:
You have a list of exact column names to use in Task 3.

---

## Task 2: Create the Supabase table

**Problem**: No table exists to store individual voucher line items.

### Steps:

**1. Create `sql/20260317_supply_voucher_lines.sql`**

```sql
-- Individual voucher line items from MISA InventoryLedger
CREATE TABLE IF NOT EXISTS fdc_supply_voucher_lines (
  id bigserial PRIMARY KEY,
  ref_no text NOT NULL,
  ref_date date NOT NULL,
  posted_date date,
  direction text NOT NULL CHECK (direction IN ('inward', 'outward')),
  account text NOT NULL,
  corresponding_account text,
  item_code text NOT NULL,
  item_name text NOT NULL,
  qty numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  unit text,
  supplier_code text,
  supplier_name text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ref_no, ref_date, item_code, direction, account)
);

CREATE INDEX idx_svl_ref_date ON fdc_supply_voucher_lines (ref_date);
CREATE INDEX idx_svl_direction ON fdc_supply_voucher_lines (direction);
CREATE INDEX idx_svl_account ON fdc_supply_voucher_lines (account);
CREATE INDEX idx_svl_supplier_code ON fdc_supply_voucher_lines (supplier_code);

-- Enable Realtime for the portal
ALTER PUBLICATION supabase_realtime ADD TABLE fdc_supply_voucher_lines;
```

**2. Run the migration on self-hosted Supabase**

```bash
PGPASSWORD=your-db-password psql -h 192.168.1.9 -p 5432 -U supabase_admin -d postgres -f sql/20260317_supply_voucher_lines.sql
```

Or via Supabase Studio SQL editor at `http://192.168.1.9:8000`.

### Verification:
```sql
SELECT COUNT(*) FROM fdc_supply_voucher_lines;
-- Should return 0 (table exists, empty)
```

---

## Task 3: Create the bridge sync job

**Problem**: No bridge job fetches individual voucher lines from MISA.

**Important**: Use the exact column names discovered in Task 1. The query below uses the most likely column names. Adjust them based on the exploration results.

### Steps:

**1. Create `fdc-lan-bridge/src/jobs/syncSupplyVouchers.ts`**

```typescript
import mssql from "mssql";
import { supabase } from "../db/supabase";
import { misaPool } from "../db/misa";
import { logger } from "../lib/logger";
import { logSync } from "../lib/syncLog";

const LOOKBACK_DAYS = 365;
const UPSERT_BATCH_SIZE = 500;

export async function syncSupplyVouchersJob(): Promise<void> {
  const startTime = Date.now();
  let recordsSynced = 0;

  try {
    logger.info("Starting syncSupplyVouchersJob...");

    if (!misaPool.connected) {
      await misaPool.connect();
    }

    const request = new mssql.Request(misaPool);

    // ====================================================
    // IMPORTANT: Adjust column names based on Task 1 findings.
    //
    // Expected columns from InventoryLedger:
    //   RefNo            - voucher reference number
    //   RefDate          - transaction date
    //   PostedDate       - posting date
    //   AccountNumber    - GL account (152x)
    //   CorrespondingAccountNumber - counterpart account
    //   InventoryItemCode - item code
    //   InventoryItemName - item name
    //   InwardQuantity   - inward qty
    //   InwardAmount     - inward amount
    //   OutwardQuantity  - outward qty
    //   OutwardAmount    - outward amount
    //   UnitPrice        - unit price (if available)
    //   JournalMemo      - description
    //
    // For supplier info, one of these patterns:
    //   a) ContactName column exists directly on InventoryLedger
    //   b) JOIN with AccountObject table on ContactCode/ObjectID
    //   c) Not available (leave supplier_code/supplier_name as null)
    //
    // Adjust the query below accordingly.
    // ====================================================

    const result = await request.query(`
      SELECT
        l.RefNo as ref_no,
        CONVERT(VARCHAR(10), l.RefDate, 23) as ref_date,
        CONVERT(VARCHAR(10), l.PostedDate, 23) as posted_date,
        SUBSTRING(l.AccountNumber, 1, 4) as account,
        l.CorrespondingAccountNumber as corresponding_account,
        l.InventoryItemCode as item_code,
        l.InventoryItemName as item_name,
        l.InwardQuantity as inward_qty,
        l.InwardAmount as inward_amount,
        l.OutwardQuantity as outward_qty,
        l.OutwardAmount as outward_amount,
        l.UnitPrice as unit_price,
        l.JournalMemo as description
      FROM InventoryLedger l
      WHERE l.AccountNumber LIKE '152%'
        AND CAST(l.RefDate AS date) >= CAST(DATEADD(DAY, -${LOOKBACK_DAYS}, GETDATE()) AS date)
        AND (l.InwardQuantity > 0 OR l.OutwardQuantity > 0)
      ORDER BY l.RefDate DESC
    `);

    // ====================================================
    // If the query above fails because some columns don't exist,
    // remove them and try again. At minimum, RefNo, RefDate,
    // AccountNumber, InventoryItemCode, InventoryItemName,
    // InwardQuantity, InwardAmount, OutwardQuantity, OutwardAmount
    // should be available. The rest is optional.
    // ====================================================

    const rows = result.recordset as any[];
    logger.info(`Found ${rows.length} voucher line rows from MISA InventoryLedger.`);

    if (rows.length === 0) {
      await logSync("syncSupplyVouchers", "completed", "MISA", 0, null, Date.now() - startTime);
      return;
    }

    // Transform to Supabase payload
    const payload = rows.map((r) => {
      const inwardQty = Number(r.inward_qty) || 0;
      const outwardQty = Number(r.outward_qty) || 0;
      const isInward = inwardQty > 0;
      const qty = isInward ? inwardQty : outwardQty;
      const amount = isInward ? (Number(r.inward_amount) || 0) : (Number(r.outward_amount) || 0);

      return {
        ref_no: r.ref_no || "UNKNOWN",
        ref_date: r.ref_date,
        posted_date: r.posted_date || null,
        direction: isInward ? "inward" : "outward",
        account: r.account,
        corresponding_account: r.corresponding_account || null,
        item_code: r.item_code,
        item_name: r.item_name,
        qty,
        unit_price: Number(r.unit_price) || (qty > 0 ? amount / qty : 0),
        amount,
        unit: null,       // Populated in Task 4 if Unit table JOIN is feasible
        supplier_code: null, // Populated in Task 4 if supplier info is found
        supplier_name: null, // Populated in Task 4 if supplier info is found
        description: r.description || null,
      };
    });

    // Upsert in batches
    for (let i = 0; i < payload.length; i += UPSERT_BATCH_SIZE) {
      const batch = payload.slice(i, i + UPSERT_BATCH_SIZE);
      const { error } = await supabase
        .from("fdc_supply_voucher_lines")
        .upsert(batch, { onConflict: "ref_no,ref_date,item_code,direction,account" });

      if (error) {
        logger.error("Error upserting voucher lines:", error);
        throw error;
      }
    }

    recordsSynced = payload.length;
    await logSync("syncSupplyVouchers", "completed", "MISA", recordsSynced, null, Date.now() - startTime);
    logger.info(`syncSupplyVouchersJob completed: ${recordsSynced} rows in ${Date.now() - startTime}ms.`);
  } catch (error: any) {
    logger.error("syncSupplyVouchersJob failed:", error);
    await logSync("syncSupplyVouchers", "failed", "MISA", recordsSynced, error?.message ?? String(error), Date.now() - startTime);
  }
}
```

### Verification:
```bash
cd /opt/fdc-lan-bridge
npx tsc --noEmit
# No type errors
```

---

## Task 4: Add supplier info (if available from Task 1)

**Problem**: Supplier name is critical for the UI. The approach depends on what Task 1 discovers.

### Option A: ContactName exists on InventoryLedger

If the exploration in Task 1 shows a column like `ContactName`, `ObjectName`, or `AccountObjectName` directly on InventoryLedger, update the query in Task 3:

```sql
-- Add to SELECT:
l.ContactName as supplier_name
-- Or whatever the actual column name is

-- And in the payload mapping:
supplier_name: r.supplier_name || null,
```

### Option B: Supplier info via JOIN

If there's a separate table (e.g., `AccountObject`, `Contact`), add a JOIN:

```sql
SELECT
  l.RefNo as ref_no,
  ...
  ao.AccountObjectName as supplier_name,
  ao.AccountObjectCode as supplier_code
FROM InventoryLedger l
LEFT JOIN AccountObject ao ON l.AccountObjectID = ao.AccountObjectID
WHERE ...
```

Find the exact table and column names from the Task 1 exploration logs.

### Option C: No supplier info available

If no supplier data is accessible, leave `supplier_code` and `supplier_name` as `null`. The UI handles this gracefully (shows "—").

### Unit name

Similarly, if a `Unit` table exists with `UnitID`/`UnitName`, add a JOIN:

```sql
LEFT JOIN Unit u ON l.UnitID = u.UnitID
-- Add to SELECT: u.UnitName as unit
```

The existing `syncMisaSupplies.ts` already JOINs with `Unit` via `InventoryItem` → reference that pattern (lines 33-48 in `syncMisaSupplies.ts`).

### Verification:
After updating, rebuild and run:
```bash
cd /opt/fdc-lan-bridge
npm run build
curl -X POST http://localhost:3333/sync/supply-vouchers
```

Check the portal at the Inventory → Nhập xuất tab. Supplier names should appear in the voucher list.

---

## Task 5: Register in scheduler and server

### Files to modify:

**1. `fdc-lan-bridge/src/scheduler.ts`**

Add import at top:
```typescript
import { syncSupplyVouchersJob } from "./jobs/syncSupplyVouchers";
```

Add to the daily 6AM batch (inside the `cron.schedule("0 6 * * *", ...)` callback), after `syncSupplyInwardJob`:
```typescript
logger.info("Running scheduled syncSupplyVouchersJob...");
await syncSupplyVouchersJob();
```

**2. `fdc-lan-bridge/src/server.ts`**

Add import at top:
```typescript
import { syncSupplyVouchersJob } from "./jobs/syncSupplyVouchers";
```

In the `POST /sync/:type` handler, inside the `case "MISA"` block, add after `syncSupplyInwardJob()`:
```typescript
await syncSupplyVouchersJob();
```

### Verification:
```bash
cd /opt/fdc-lan-bridge
npm run build
sudo systemctl restart fdc-lan-bridge
curl -X POST http://localhost:3333/sync/MISA
# Check logs:
sudo journalctl -u fdc-lan-bridge -n 50 --no-pager | grep -i voucher
```

---

## Task 6: Run initial sync and verify

### Steps:

```bash
# 1. Build and restart
cd /opt/fdc-lan-bridge
npm run build
sudo systemctl restart fdc-lan-bridge

# 2. Trigger manual sync
curl -X POST http://localhost:3333/sync/MISA

# 3. Wait for completion, check logs
sleep 30
sudo journalctl -u fdc-lan-bridge -n 100 --no-pager | grep -i voucher

# 4. Verify data in Supabase
PGPASSWORD=your-db-password psql -h 192.168.1.9 -p 5432 -U supabase_admin -d postgres -c "
  SELECT direction, COUNT(*), SUM(amount) as total_amount
  FROM fdc_supply_voucher_lines
  GROUP BY direction;
"

# 5. Check a sample voucher
PGPASSWORD=your-db-password psql -h 192.168.1.9 -p 5432 -U supabase_admin -d postgres -c "
  SELECT ref_no, ref_date, direction, supplier_name, item_name, qty, amount
  FROM fdc_supply_voucher_lines
  ORDER BY ref_date DESC
  LIMIT 20;
"
```

### Verification:
- Data appears in `fdc_supply_voucher_lines` with correct `ref_no`, `direction`, `amount`
- Portal Inventory → Nhập xuất tab switches to voucher view automatically
- Each voucher can be expanded to show line items

---

## Task 7: Clean up

- Delete `fdc-lan-bridge/src/jobs/exploreMisa.ts` (temporary exploration file)
- Remove the `case "explore-misa"` endpoint from `server.ts`
- Commit changes

---

## Summary of changes

| File | Changes |
|---|---|
| `sql/20260317_supply_voucher_lines.sql` | New: Supabase table migration |
| `fdc-lan-bridge/src/jobs/syncSupplyVouchers.ts` | New: Bridge sync job |
| `fdc-lan-bridge/src/jobs/exploreMisa.ts` | Temporary: Schema exploration (delete after Task 1) |
| `fdc-lan-bridge/src/scheduler.ts` | Add syncSupplyVouchersJob to 6AM daily batch |
| `fdc-lan-bridge/src/server.ts` | Add syncSupplyVouchersJob to MISA sync endpoint |

## Important notes

- The MISA SQL query in Task 3 uses **best-guess column names**. Task 1 MUST be completed first to verify the actual column names. If `RefNo`, `CorrespondingAccountNumber`, `UnitPrice`, or `JournalMemo` don't exist, remove them from the query and adjust accordingly.
- The unique constraint is `(ref_no, ref_date, item_code, direction, account)`. If MISA has duplicate rows for the same item in the same voucher (e.g., different batches), the upsert will merge them. This is acceptable for the current use case.
- The portal frontend (`ImportExportTab.tsx` and `useImportExport.ts`) is already deployed and reads from `fdc_supply_voucher_lines`. Once data appears in the table, the UI will automatically switch from the daily aggregate fallback to the voucher-grouped view.
