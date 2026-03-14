-- fdc_delegations: stores approval authority delegation records
CREATE TABLE IF NOT EXISTS public.fdc_delegations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_id uuid NOT NULL REFERENCES public.fdc_user_mapping(id) ON DELETE CASCADE,
  delegate_id  uuid NOT NULL REFERENCES public.fdc_user_mapping(id) ON DELETE CASCADE,
  request_types text[] NOT NULL DEFAULT '{}',
  start_date   date NOT NULL,
  end_date     date NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fdc_delegations_delegate
  ON public.fdc_delegations (delegate_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_fdc_delegations_delegator
  ON public.fdc_delegations (delegator_id);

-- RLS: fdc_user_mapping.id != auth.uid() — auth.uid() maps via supabase_uid
ALTER TABLE public.fdc_delegations ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read delegations where they are delegator or delegate
CREATE POLICY "users can read their own delegations"
  ON public.fdc_delegations FOR SELECT
  TO authenticated
  USING (
    delegate_id  = (SELECT id FROM public.fdc_user_mapping WHERE supabase_uid = auth.uid())
    OR
    delegator_id = (SELECT id FROM public.fdc_user_mapping WHERE supabase_uid = auth.uid())
  );

-- Only super_admin can insert/update/delete
CREATE POLICY "super_admin can manage delegations"
  ON public.fdc_delegations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.fdc_user_mapping
      WHERE supabase_uid = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.fdc_user_mapping
      WHERE supabase_uid = auth.uid() AND role = 'super_admin'
    )
  );
