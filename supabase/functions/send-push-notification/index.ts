import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

type NotificationRecord = {
  recipient_id?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown> | null;
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@fdc-portal.local";

if (!vapidPublicKey || !vapidPrivateKey) {
  throw new Error("Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY secret");
}

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const record = (payload?.record ?? {}) as NotificationRecord;

    if (!record.recipient_id) {
      return new Response(JSON.stringify({ sent: 0, reason: "missing recipient_id" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: subscriptions, error: subError } = await supabase
      .from("fdc_push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", record.recipient_id);

    if (subError) {
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;

    for (const sub of subscriptions as PushSubscriptionRow[]) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          JSON.stringify({
            title: record.title ?? "Thông báo mới",
            body: record.body ?? "",
            data: record.data ?? {},
            icon: "/icon-192.png",
            badge: "/icon-192.png",
          }),
        );

        sent += 1;
      } catch (error) {
        const statusCode = typeof error === "object" && error !== null && "statusCode" in error
          ? Number((error as { statusCode?: number }).statusCode)
          : null;

        console.error("Push delivery failed", { endpoint: sub.endpoint, error });

        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("fdc_push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }

    return new Response(JSON.stringify({ sent }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-push-notification failed", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
