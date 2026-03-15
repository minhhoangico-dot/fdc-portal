# TODO: Deploy Import/Export Tab + Push

Round 1 (31 items) and Round 2 (12 items) audit fixes are done. This file covers remaining deployment tasks.

---

## 1. Create Supabase table for inward data

Run this SQL in the Supabase SQL Editor (Dashboard → SQL Editor → New query):

```sql
CREATE TABLE fdc_supply_inward_daily (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date DATE NOT NULL,
  account VARCHAR(10) NOT NULL,
  item_code VARCHAR(100) NOT NULL,
  item_name TEXT NOT NULL,
  inward_qty NUMERIC NOT NULL DEFAULT 0,
  inward_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(report_date, account, item_code)
);

CREATE INDEX idx_supply_inward_daily_date ON fdc_supply_inward_daily(report_date);

ALTER TABLE fdc_supply_inward_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON fdc_supply_inward_daily
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service write" ON fdc_supply_inward_daily
  FOR ALL TO service_role USING (true);
```

This table stores daily inward (import/purchase) transactions from MISA InventoryLedger, grouped by date + item. It mirrors the existing `fdc_supply_consumption_daily` table (which stores outward/consumption).

---

## 2. Push all commits to remote

```bash
git push fdc-portal main
```

Commits to push:
- `745a570` fix: address round 2 portal audit issues
- `c44e2a4` feat(inventory): add Import/Export control tab (Nhập xuất)

---

## 3. Redeploy fdc-lan-bridge

After pushing, redeploy the bridge on the on-prem server. The new `syncSupplyInwardJob` is registered in:
- `scheduler.ts` — runs daily at 6 AM with the other MISA jobs
- `server.ts` — included in `POST /sync/MISA` manual trigger

---

## 4. Backfill inward data

After the bridge is running and the Supabase table exists, trigger a MISA sync to backfill 1 year of inward data:

```bash
curl -X POST "http://<bridge-host>:3333/sync/MISA"
```

The new "Nhập xuất" tab in Kho vật tư will show outward data immediately. Inward data appears after this sync completes.

---

## Notes

- Steps 1 and 3–4 are manual ops — they cannot be automated by Codex
- Step 2 (push) is the only step Codex can execute
- The Import/Export tab gracefully handles missing inward data with an info banner
