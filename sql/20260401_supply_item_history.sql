-- Supply item history for room-management autocomplete.
-- Keeps direct Supabase upserts on the table contract while counting repeated uses.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.fdc_supply_item_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL,
  item_name text NOT NULL,
  unit text NOT NULL,
  last_qty numeric,
  use_count integer NOT NULL DEFAULT 1 CHECK (use_count > 0),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, item_name, unit)
);

CREATE INDEX IF NOT EXISTS idx_supply_item_history_room
  ON public.fdc_supply_item_history (room_id, use_count DESC, item_name ASC);

CREATE INDEX IF NOT EXISTS idx_supply_item_history_global
  ON public.fdc_supply_item_history (use_count DESC, item_name ASC);

CREATE OR REPLACE FUNCTION public.fdc_supply_item_history_increment_use_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.room_id := btrim(NEW.room_id);
  NEW.item_name := btrim(NEW.item_name);
  NEW.unit := btrim(NEW.unit);
  NEW.last_used_at := COALESCE(NEW.last_used_at, now());

  IF TG_OP = 'UPDATE' THEN
    NEW.use_count := COALESCE(OLD.use_count, 0) + 1;
    NEW.created_at := OLD.created_at;
  ELSE
    NEW.use_count := COALESCE(NEW.use_count, 1);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_supply_item_history_increment_use_count
ON public.fdc_supply_item_history;

CREATE TRIGGER trg_supply_item_history_increment_use_count
BEFORE INSERT OR UPDATE
ON public.fdc_supply_item_history
FOR EACH ROW
EXECUTE FUNCTION public.fdc_supply_item_history_increment_use_count();

ALTER TABLE public.fdc_supply_item_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read supply item history"
ON public.fdc_supply_item_history;
CREATE POLICY "Authenticated users can read supply item history"
ON public.fdc_supply_item_history
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert supply item history"
ON public.fdc_supply_item_history;
CREATE POLICY "Authenticated users can insert supply item history"
ON public.fdc_supply_item_history
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update supply item history"
ON public.fdc_supply_item_history;
CREATE POLICY "Authenticated users can update supply item history"
ON public.fdc_supply_item_history
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
