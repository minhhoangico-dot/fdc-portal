# Backend Plan for Codex

This document describes the Supabase backend tasks needed to support four new frontend features. The frontend is already built — Codex should implement only the backend (SQL migrations, storage buckets, RLS policies, edge functions).

---

## 1. Document/Attachment Support

### 1.1 Storage Bucket

Create a Supabase Storage bucket for request attachments.

```sql
-- Run via Supabase Dashboard > Storage, or via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('request-attachments', 'request-attachments', true);
```

### 1.2 Storage RLS Policies

```sql
-- Anyone authenticated can upload to the bucket
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'request-attachments');

-- Anyone authenticated can read files
CREATE POLICY "Authenticated users can read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'request-attachments');

-- Only the uploader or admin roles can delete
CREATE POLICY "Uploader or admin can delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'request-attachments'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM fdc_approval_requests
      WHERE requester_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM fdc_user_mapping
      WHERE id = auth.uid() AND role IN ('super_admin', 'director')
    )
  )
);
```

### 1.3 Attachments Metadata Table

```sql
CREATE TABLE IF NOT EXISTS fdc_request_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES fdc_approval_requests(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES fdc_user_mapping(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by request
CREATE INDEX idx_request_attachments_request_id ON fdc_request_attachments(request_id);
```

### 1.4 Attachments RLS Policies

```sql
ALTER TABLE fdc_request_attachments ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read attachments (same visibility as requests)
CREATE POLICY "Authenticated can read attachments"
ON fdc_request_attachments FOR SELECT
TO authenticated
USING (true);

-- Authenticated users can insert attachments for their own requests
CREATE POLICY "Requester can insert attachments"
ON fdc_request_attachments FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM fdc_approval_requests
    WHERE id = request_id AND requester_id = auth.uid()
  )
);

-- Only uploader or admin can delete
CREATE POLICY "Uploader or admin can delete attachments"
ON fdc_request_attachments FOR DELETE
TO authenticated
USING (
  uploaded_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM fdc_user_mapping
    WHERE id = auth.uid() AND role IN ('super_admin', 'director')
  )
);
```

---

## 2. Cost Center Tracking

### 2.1 Add Column to Approval Requests

```sql
-- Add cost_center column if it doesn't exist
ALTER TABLE fdc_approval_requests
ADD COLUMN IF NOT EXISTS cost_center TEXT;

-- Index for filtering/reporting
CREATE INDEX IF NOT EXISTS idx_approval_requests_cost_center
ON fdc_approval_requests(cost_center);
```

### 2.2 Valid Cost Centers

The frontend uses these cost center keys (defined in `src/lib/constants.ts`):

| Key         | Label (Vietnamese)       |
|-------------|--------------------------|
| `general`   | Chung                    |
| `clinic`    | Phòng khám               |
| `pharmacy`  | Nhà thuốc                |
| `lab`       | Xét nghiệm              |
| `imaging`   | Chẩn đoán hình ảnh      |
| `admin`     | Hành chính               |
| `facility`  | Cơ sở vật chất           |
| `marketing` | Marketing                |
| `it`        | Công nghệ thông tin      |

Optionally, add a CHECK constraint:

```sql
ALTER TABLE fdc_approval_requests
ADD CONSTRAINT chk_cost_center CHECK (
  cost_center IS NULL OR cost_center IN (
    'general', 'clinic', 'pharmacy', 'lab', 'imaging',
    'admin', 'facility', 'marketing', 'it'
  )
);
```

No RLS changes needed — cost_center inherits the existing RLS policies on `fdc_approval_requests`.

---

## 3. Reporting/Export Module

No new tables or backend changes needed. The reporting module is entirely frontend-driven:

- The frontend `useReports` viewmodel queries `fdc_approval_requests` with date/type/status/cost_center/department filters.
- All aggregations (by type, cost center, department, month) are computed client-side via `useMemo`.
- CSV export is generated client-side using Blob download.
- The Reports page is accessible to roles: `super_admin`, `director`, `chairman`, `accountant`.

**Existing RLS on `fdc_approval_requests` must allow these roles to read all rows.** Verify that the existing SELECT policy grants access to these admin roles (it likely already does based on the existing approval workflow).

If not, add:

```sql
CREATE POLICY "Admin roles can read all requests"
ON fdc_approval_requests FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM fdc_user_mapping
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'director', 'chairman', 'accountant')
  )
  OR requester_id = auth.uid()
);
```

---

## 4. Push Notifications (PWA)

### 4.1 Push Subscriptions Table

```sql
CREATE TABLE IF NOT EXISTS fdc_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES fdc_user_mapping(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by user
CREATE INDEX idx_push_subscriptions_user_id ON fdc_push_subscriptions(user_id);
```

### 4.2 Push Subscriptions RLS

```sql
ALTER TABLE fdc_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users manage own subscriptions"
ON fdc_push_subscriptions FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

### 4.3 VAPID Key Generation

Generate a VAPID key pair for web push. Store the private key as a Supabase secret, expose the public key as a frontend env var.

```bash
# Generate VAPID keys (run locally with web-push CLI)
npx web-push generate-vapid-keys
```

Store in environment:
- **Frontend** (`.env.local`): `VITE_VAPID_PUBLIC_KEY=<public_key>`
- **Supabase Edge Function secret**: `VAPID_PRIVATE_KEY=<private_key>`
- **Supabase Edge Function secret**: `VAPID_PUBLIC_KEY=<public_key>`

### 4.4 Supabase Edge Function: `send-push-notification`

Create a Supabase Edge Function that sends push notifications when a new row is inserted into `fdc_notifications`.

**File**: `supabase/functions/send-push-notification/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Web Push library for Deno
// Use: https://deno.land/x/web_push or implement manually with crypto

serve(async (req) => {
  const { record } = await req.json(); // Triggered by database webhook

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get push subscriptions for the notification recipient
  const { data: subscriptions } = await supabase
    .from("fdc_push_subscriptions")
    .select("*")
    .eq("user_id", record.recipient_id);

  if (!subscriptions || subscriptions.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

  let sent = 0;
  for (const sub of subscriptions) {
    try {
      // Build the push message payload
      const payload = JSON.stringify({
        title: record.title,
        body: record.body,
        data: record.data,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
      });

      // Send push notification using Web Push protocol
      // Implementation: use web_push library or manual VAPID + ECDH
      // Reference: https://web.dev/push-notifications-web-push-protocol/

      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };

      // TODO: Implement actual web-push send using VAPID credentials
      // For production, use a Deno-compatible web-push library

      sent++;
    } catch (err) {
      console.error("Push failed for endpoint:", sub.endpoint, err);

      // Remove expired/invalid subscriptions
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase
          .from("fdc_push_subscriptions")
          .delete()
          .eq("id", sub.id);
      }
    }
  }

  return new Response(JSON.stringify({ sent }), { status: 200 });
});
```

### 4.5 Database Webhook Trigger

Set up a Supabase Database Webhook that calls the edge function when a notification is inserted:

```sql
-- Option A: Use Supabase Dashboard > Database > Webhooks
-- Table: fdc_notifications
-- Event: INSERT
-- URL: <supabase-project-url>/functions/v1/send-push-notification
-- Headers: Authorization: Bearer <service_role_key>

-- Option B: Use pg_net extension (if available)
CREATE OR REPLACE FUNCTION notify_push_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object('record', row_to_json(NEW))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_push_notification
AFTER INSERT ON fdc_notifications
FOR EACH ROW
EXECUTE FUNCTION notify_push_on_insert();
```

### 4.6 Service Worker Push Handler

The frontend PWA (via `vite-plugin-pwa`) auto-generates a service worker. To handle push events, create a custom SW file that gets imported.

**File**: `public/sw-push.js`

```javascript
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    data: data.data,
    vibrate: [100, 50, 100],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const linkTo = event.notification.data?.linkTo || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(linkTo) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(linkTo);
    })
  );
});
```

Then update `vite.config.ts` workbox config to include:

```typescript
workbox: {
  importScripts: ['/sw-push.js'],
  // ... existing config
}
```

---

## Summary Checklist

| # | Task | Type |
|---|------|------|
| 1 | Create `request-attachments` storage bucket | Storage |
| 2 | Add storage bucket RLS policies | RLS |
| 3 | Create `fdc_request_attachments` table | Migration |
| 4 | Add RLS on `fdc_request_attachments` | RLS |
| 5 | Add `cost_center` column to `fdc_approval_requests` | Migration |
| 6 | Add cost center CHECK constraint (optional) | Migration |
| 7 | Verify admin SELECT policy on `fdc_approval_requests` for reporting | RLS |
| 8 | Create `fdc_push_subscriptions` table | Migration |
| 9 | Add RLS on `fdc_push_subscriptions` | RLS |
| 10 | Generate VAPID keys and store as secrets | Config |
| 11 | Create `send-push-notification` edge function | Edge Function |
| 12 | Set up database webhook on `fdc_notifications` INSERT | Webhook |
| 13 | Create `public/sw-push.js` push event handler | Static File |
| 14 | Update vite workbox config to importScripts sw-push.js | Config |

---

## Environment Variables to Add

### Frontend `.env.local`
```
VITE_VAPID_PUBLIC_KEY=<generated-vapid-public-key>
```

### Supabase Edge Function Secrets
```
VAPID_PRIVATE_KEY=<generated-vapid-private-key>
VAPID_PUBLIC_KEY=<generated-vapid-public-key>
```
