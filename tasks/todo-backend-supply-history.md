# Backend Task: Supply Item History Table

## Context

The room management module is being redesigned to support smart autocomplete when creating supply requests. The frontend will query a `fdc_supply_item_history` table to suggest previously-used items. This task creates the Supabase migration for that table.

## Requirements

### 1. Create `fdc_supply_item_history` table

Create a new SQL migration file at `sql/20260401_supply_item_history.sql`:

```sql
CREATE TABLE IF NOT EXISTS fdc_supply_item_history (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id     text NOT NULL,
  item_name   text NOT NULL,
  unit        text NOT NULL,
  last_qty    numeric,
  use_count   integer DEFAULT 1,
  last_used_at timestamptz DEFAULT now(),
  created_at  timestamptz DEFAULT now(),
  UNIQUE(room_id, item_name, unit)
);

-- Index for fast room-specific queries (ordered by frequency)
CREATE INDEX IF NOT EXISTS idx_supply_item_history_room
  ON fdc_supply_item_history (room_id, use_count DESC);

-- Index for global suggestions (excluding a specific room)
CREATE INDEX IF NOT EXISTS idx_supply_item_history_global
  ON fdc_supply_item_history (use_count DESC);
```

### 2. Enable RLS

```sql
ALTER TABLE fdc_supply_item_history ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read suggestions
CREATE POLICY "Authenticated users can read supply item history"
  ON fdc_supply_item_history
  FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users can insert/update (upsert)
CREATE POLICY "Authenticated users can upsert supply item history"
  ON fdc_supply_item_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update supply item history"
  ON fdc_supply_item_history
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

### 3. Handle upsert with use_count increment

The frontend will call:
```typescript
supabase.from('fdc_supply_item_history').upsert(
  items.map(item => ({
    room_id: roomId,
    item_name: item.itemName,
    unit: item.unit,
    last_qty: item.quantity,
    use_count: 1,
    last_used_at: new Date().toISOString(),
  })),
  { onConflict: 'room_id,item_name,unit' }
)
```

Supabase PostgREST upsert with `onConflict` does a simple replace by default. To increment `use_count` instead of replacing it, create a trigger:

```sql
CREATE OR REPLACE FUNCTION fn_supply_item_history_upsert()
RETURNS trigger AS $$
BEGIN
  -- If row already exists (conflict), increment use_count and update fields
  IF EXISTS (
    SELECT 1 FROM fdc_supply_item_history
    WHERE room_id = NEW.room_id AND item_name = NEW.item_name AND unit = NEW.unit
  ) THEN
    UPDATE fdc_supply_item_history
    SET use_count = use_count + 1,
        last_qty = NEW.last_qty,
        last_used_at = NEW.last_used_at
    WHERE room_id = NEW.room_id AND item_name = NEW.item_name AND unit = NEW.unit;
    RETURN NULL; -- Suppress the INSERT
  END IF;
  RETURN NEW; -- Allow INSERT for new rows
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_supply_item_history_upsert
  BEFORE INSERT ON fdc_supply_item_history
  FOR EACH ROW
  EXECUTE FUNCTION fn_supply_item_history_upsert();
```

**Alternative approach** (simpler, if trigger is too complex): Create an RPC function:

```sql
CREATE OR REPLACE FUNCTION upsert_supply_item_history(
  p_room_id text,
  p_item_name text,
  p_unit text,
  p_last_qty numeric
) RETURNS void AS $$
BEGIN
  INSERT INTO fdc_supply_item_history (room_id, item_name, unit, last_qty, use_count, last_used_at)
  VALUES (p_room_id, p_item_name, p_unit, p_last_qty, 1, now())
  ON CONFLICT (room_id, item_name, unit)
  DO UPDATE SET
    use_count = fdc_supply_item_history.use_count + 1,
    last_qty = EXCLUDED.last_qty,
    last_used_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

If using the RPC approach, the frontend will call:
```typescript
for (const item of items) {
  await supabase.rpc('upsert_supply_item_history', {
    p_room_id: roomId,
    p_item_name: item.itemName,
    p_unit: item.unit,
    p_last_qty: item.quantity,
  });
}
```

### 4. Apply migration

Run the migration against the self-hosted Supabase instance at `192.168.1.9:8000`.

## Checklist

- [ ] Create `sql/20260401_supply_item_history.sql` with table + indexes
- [ ] Add RLS policies (read for all authenticated, insert/update for all authenticated)
- [ ] Implement upsert with `use_count` increment (trigger OR RPC — pick one)
- [ ] Test: insert new item → row created with use_count=1
- [ ] Test: insert same item again → use_count increments to 2, last_qty updated
- [ ] Test: query by room_id returns items ordered by use_count DESC
- [ ] Apply migration to Supabase
