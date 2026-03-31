## FDC Portal – Approval & Inventory System

FDC Portal is a React + Supabase web app for handling approval workflows, inventory visibility, and operational dashboards for Phòng khám Gia Đình. It connects to data synchronized from on‑prem HIS and MISA systems via the `fdc-lan-bridge` service.

---

## Tech Stack

- **Frontend**: React 19, React Router, Vite 6, Tailwind CSS 4
- **State & Data**: Supabase (auth + Postgres)
- **Architecture**: MVVM-style with `viewmodels/`, `app/` pages, and shared layout components

---

## Getting Started

**Prerequisites:** Node.js 20+ and access to the self-hosted Supabase instance.

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   Create `.env.local` based on `.env.example` and set:

   - `VITE_SUPABASE_URL` – the public self-hosted URL (`https://supabase.fdc-nhanvien.org`)
   - `VITE_SUPABASE_ANON_KEY` – the anon key from `/opt/supabase/repo/docker/.env`
   - `VITE_VAPID_PUBLIC_KEY` – the push public key used by the edge function

3. **Run the dev server**

   ```bash
   npm run dev
   ```

   The app will be available on `http://localhost:3000` by default.

---

## Build & Preview

- **Build**

  ```bash
  npm run build
  ```

- **Preview production build**

  ```bash
  npm run preview
  ```

---

## Supabase Integration (High Level)

- Auth is handled by self-hosted Supabase; the portal maps authenticated users to HIS staff via the `fdc_user_mapping` table.
- Core tables used include:
  - `fdc_approval_requests`, `fdc_approval_steps`, `fdc_notifications`
  - `fdc_inventory_snapshots`, `fdc_analytics_anomalies`
  - `fdc_sync_health`, `fdc_sync_logs`

The `fdc-lan-bridge` service (separate project) is responsible for synchronizing data from HIS/MISA into these tables. In production it should point to `http://192.168.1.9:8000` on the LAN and use the self-hosted service role key.
