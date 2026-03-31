# Server Plan: Install fdc-lan-bridge on Vostro 3470

> **For**: Claude Code running on Ubuntu server (`hbminh@vostro3470`)
>
> **Goal**: Install and run the fdc-lan-bridge Node.js service on the same machine as self-hosted Supabase, then add a Cloudflare Tunnel route so the portal on Cloudflare Pages can reach it.

---

## Context

The fdc-lan-bridge is a Node.js microservice that syncs data from on-prem databases (HIS PostgreSQL, MISA SQL Server, Hikvision) into Supabase. The source code needs to be copied to this machine. It needs to run as a persistent systemd service.

The bridge exposes an HTTP API on port 3333:
- `GET /health` — health check
- `POST /sync/:type` — trigger manual sync

The portal (on Cloudflare Pages at HTTPS) needs to reach the bridge. A Cloudflare Tunnel public hostname route will expose the bridge securely.

---

## Step 1: Install Node.js (if not already installed)

```bash
node --version
# If not installed:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

## Step 2: Get the bridge code

The user will SCP the bridge code to the server. Wait for files at `/opt/fdc-lan-bridge/`.

If the directory doesn't exist yet, create it:
```bash
sudo mkdir -p /opt/fdc-lan-bridge
sudo chown hbminh:hbminh /opt/fdc-lan-bridge
```

---

## Step 3: Install dependencies and build

```bash
cd /opt/fdc-lan-bridge
npm install
npm run build
```

Verify: `ls dist/index.js` should exist.

---

## Step 4: Create .env file

Create `/opt/fdc-lan-bridge/.env`:

```env
# SELF-HOSTED SUPABASE (WRITE) — use LAN IP, not tunnel
SUPABASE_URL="http://192.168.1.9:8000"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzM2NTkxNjAsImV4cCI6MTkzMTMzOTE2MH0.GtVEBMwsDqlArSxhgfYdBvlgM-jQRVXRU347QebDBLk"

# HIS POSTGRESQL (READ-ONLY)
HIS_DB_HOST="192.168.1.253"
HIS_DB_PORT="5642"
HIS_DB_NAME="pkgd"
HIS_DB_USER="n8n"
HIS_DB_PASSWORD="bsgd2022@EHC"

# MISA SQL SERVER (READ-ONLY)
MISA_DB_SERVER="192.168.1.2"
MISA_DB_PORT="50114"
MISA_DB_NAME="FDC"
MISA_DB_USER="fdc_readonly"
MISA_DB_PASSWORD="StrongPassword123!"

# SERVER CONFIG
PORT=3333
NODE_ENV="production"

# HIKVISION ISAPI
HIKVISION_HOST="192.168.1.11"
HIKVISION_USERNAME="admin"
HIKVISION_PASSWORD="Bsgd24062011"
HIKVISION_TIMEOUT=30000
TZ="Asia/Ho_Chi_Minh"
```

---

## Step 5: Test the bridge

```bash
cd /opt/fdc-lan-bridge
node dist/index.js
```

Check output for:
- Supabase connection at http://192.168.1.9:8000
- HIS PostgreSQL connection at 192.168.1.253:5642
- MISA SQL Server connection at 192.168.1.2:50114
- HTTP server listening on port 3333

Verify: `curl http://localhost:3333/health`

Stop with Ctrl+C after verifying.

---

## Step 6: Create systemd service

Create `/etc/systemd/system/fdc-lan-bridge.service`:

```ini
[Unit]
Description=FDC LAN Bridge - Data sync service
After=network.target docker.service
Wants=docker.service

[Service]
Type=simple
User=hbminh
WorkingDirectory=/opt/fdc-lan-bridge
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable fdc-lan-bridge
sudo systemctl start fdc-lan-bridge
sudo systemctl status fdc-lan-bridge
```

Verify: `curl http://localhost:3333/health` returns JSON.

---

## Step 7: Add Cloudflare Tunnel route for bridge

Go to **Cloudflare Zero Trust dashboard** → Networks → Connectors → FDC-vostro3470 → Published application routes → Add:

- **Subdomain**: `bridge`
- **Domain**: `fdc-nhanvien.org`
- **Service type**: `HTTP`
- **URL**: `localhost:3333`

OR if the tunnel uses a local config file:

```bash
cat /etc/cloudflared/config.yml 2>/dev/null || cat ~/.cloudflared/config.yml 2>/dev/null
```

Add the route and restart cloudflared:
```bash
sudo systemctl restart cloudflared
```

---

## Step 8: Verify

```bash
curl http://localhost:3333/health
curl https://bridge.fdc-nhanvien.org/health
```

Both should return bridge health JSON.

---

## Done when

- `fdc-lan-bridge.service` is active and enabled
- `curl https://bridge.fdc-nhanvien.org/health` returns `200` with health data
- Bridge heartbeat is updating `fdc_sync_health` in the database
