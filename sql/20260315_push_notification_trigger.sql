-- Requires the send-push-notification Edge Function to be deployed with --no-verify-jwt.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.notify_push_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'http://supabase-edge-functions:9000/send-push-notification',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object('record', row_to_json(NEW))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_push_notification ON public.fdc_notifications;
CREATE TRIGGER trg_push_notification
AFTER INSERT ON public.fdc_notifications
FOR EACH ROW
EXECUTE FUNCTION public.notify_push_on_insert();
