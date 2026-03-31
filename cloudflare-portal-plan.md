<!--
@license
SPDX-License-Identifier: Apache-2.0
-->

# Plan: Finish Cloudflare Portal Deployment (`portal.fdc-nhanvien.org`)

> **For**: Claude Code / Codex continuing from the current workspace
>
> **Repo**: `C:\Users\Minh\Desktop\ERP_v1`
>
> **Goal**: Put the current portal frontend on Cloudflare Pages and make `https://portal.fdc-nhanvien.org` serve the app successfully.

---

## Current state

The app build is already valid and the frontend has already been deployed to Cloudflare Pages:

- Cloudflare account id: `17d69a41b7134ae1287ca564c9cd2a8b`
- Zone id for `fdc-nhanvien.org`: `ac7fd155b1310d308545610f4d6facca`
- Pages project: `fdc-portal`
- Pages project id: `31df6c73-ae05-4ff3-836e-bcb451d392c1`
- Latest Pages deployment id: `86ce80dd-9bfa-45a0-8222-266c4b62b509`
- Latest Pages deployment URL: `https://86ce80dd.fdc-portal.pages.dev`

The latest deployment is healthy:

- `npm run build` passed locally before deploy
- `https://86ce80dd.fdc-portal.pages.dev/weekly-report/tv` returned `200`
- `public/_redirects` already exists with SPA fallback

The custom domain has already been added to the Pages project:

- Hostname: `portal.fdc-nhanvien.org`
- Pages domain id: `c5a950cf-8d65-4a03-aad9-3c02cb3b440d`

But it is **not live yet** because DNS is missing:

- Current Pages domain status: `pending`
- Current verification error: `CNAME record not set`
- `nslookup portal.fdc-nhanvien.org` currently returns `NXDOMAIN`

---

## Important constraint

The currently logged-in Wrangler session can deploy Pages, but it could not edit DNS records for the zone through direct REST calls. A direct query to the zone DNS records returned `403 Forbidden`.

Interpretation:

- Pages deploy is done
- Pages custom domain object is done
- The unfinished part is **DNS setup for `portal`**

Do not spend time changing application code unless a fresh build starts failing. This is now an infrastructure completion task, not a frontend implementation task.

---

## Task 1: Verify current Pages deployment still looks correct

Run:

```powershell
cmd /c npx wrangler whoami
cmd /c npx wrangler pages deployment list --project-name fdc-portal
cmd /c curl.exe -I https://86ce80dd.fdc-portal.pages.dev/weekly-report/tv
```

Expected:

- `fdc-portal` is still the Pages project
- latest deployment is still available
- `/weekly-report/tv` returns `200`

If deployment is missing or stale, rebuild and redeploy:

```powershell
cmd /c npm.cmd run build
cmd /c npx wrangler pages deploy dist --project-name fdc-portal --branch main --commit-dirty=true
```

Do not redeploy if the build fails.

---

## Task 2: Create the missing DNS record

The Pages API already says exactly what is missing: `CNAME record not set`.

Create this DNS record in the Cloudflare zone `fdc-nhanvien.org`:

- Type: `CNAME`
- Name: `portal`
- Target: `fdc-portal.pages.dev`
- Proxy: `ON`
- TTL: `Auto`

### Preferred path

If Claude Code has access to a Cloudflare tool or token with DNS edit permission, create/update the record directly.

### Fallback path

If DNS edit is still blocked from CLI/API, finish this step in the Cloudflare Dashboard:

1. Open zone `fdc-nhanvien.org`
2. Go to `DNS`
3. Add record:
   - `CNAME`
   - `portal`
   - `fdc-portal.pages.dev`
   - proxied

### Important

If a record for `portal` already exists and points somewhere else, update it instead of creating a duplicate.

---

## Task 3: Poll Pages custom domain until it becomes active

Use the existing Wrangler OAuth token from the local config only for authenticated API calls. Do not print the token in logs or commit it anywhere.

PowerShell helper:

```powershell
@'
$token = (Get-Content $env:APPDATA\xdg.config\.wrangler\config\default.toml | Select-String '^oauth_token = "([^"]+)"').Matches[0].Groups[1].Value
$headers = @{ Authorization = "Bearer $token" }
$resp = Invoke-RestMethod -Headers $headers -Uri 'https://api.cloudflare.com/client/v4/accounts/17d69a41b7134ae1287ca564c9cd2a8b/pages/projects/fdc-portal/domains/portal.fdc-nhanvien.org'
$resp | ConvertTo-Json -Depth 10
'@ | powershell -NoProfile -Command -
```

Wait until:

- `status` is no longer `pending`
- `verification_data.status` is no longer `pending`
- the error `CNAME record not set` disappears

---

## Task 4: Verify DNS and HTTPS end-to-end

Run:

```powershell
nslookup portal.fdc-nhanvien.org
cmd /c curl.exe -I https://portal.fdc-nhanvien.org
cmd /c curl.exe -I https://portal.fdc-nhanvien.org/weekly-report/tv
```

Expected:

- `portal.fdc-nhanvien.org` resolves in DNS
- HTTPS works without certificate errors
- root path returns `200` or a normal SPA response
- `/weekly-report/tv` returns `200`

If the domain resolves but TLS is still provisioning, wait a few minutes and retry.

---

## Task 5: Optional cleanup

`wrangler pages download config fdc-portal` generated a local `wrangler.toml` during debugging. It has already been removed once. If it appears again and the team does not want to keep it, remove it before finishing.

Check:

```powershell
git status --short
```

Do not leave behind temporary infra-debug files unless they are intentionally committed.

---

## Acceptance criteria

The task is complete only when all of the following are true:

- `https://portal.fdc-nhanvien.org` opens the Cloudflare Pages deployment
- `https://portal.fdc-nhanvien.org/weekly-report/tv` returns `200`
- Pages custom domain status is healthy, not `pending`
- DNS for `portal.fdc-nhanvien.org` exists and points to `fdc-portal.pages.dev`
- No application code changes were introduced just to work around missing DNS

---

## Notes for the next agent

- The unfinished part is **not** the app build and **not** the Pages deployment. Those are already done.
- The remaining blocker is only the `portal` DNS record.
- If CLI/API DNS edit remains blocked, stop trying to force it through the current Wrangler session and use the Cloudflare Dashboard or a credential with DNS edit permission.
