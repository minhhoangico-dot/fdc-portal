# Task: Fix Hikvision digest-fetch / node-fetch fragility

## Context

`fdc-lan-bridge/src/lib/hikvision.ts` uses `digest-fetch` for Hikvision API authentication. `digest-fetch@2.0.3` requires `node-fetch` at runtime but only declares it as a `devDependency` — so fdc-lan-bridge carries `node-fetch@^2.7.0` as a direct dependency to compensate. PM2 logs have shown `MODULE_NOT_FOUND` errors for `node-fetch` historically, and the import uses `@ts-ignore`.

The goal is to replace `digest-fetch` + `node-fetch` with Node's built-in `fetch` (available since Node 18+, stable in 20+) and inline digest auth, eliminating both dependencies.

## Files to modify

- `fdc-lan-bridge/src/lib/hikvision.ts` — replace digest-fetch with built-in fetch + inline digest auth
- `fdc-lan-bridge/package.json` — remove `digest-fetch` and `node-fetch` from dependencies

## Requirements

### Replace digest-fetch with inline digest auth

In `fdc-lan-bridge/src/lib/hikvision.ts`:

1. Remove the `digest-fetch` import (and its `@ts-ignore`)
2. Remove any `node-fetch` import if present
3. Use Node's built-in global `fetch` (no import needed — Node 20+ has it)
4. Implement digest authentication inline:
   - Make an initial request to get the `WWW-Authenticate` header (401 response)
   - Parse the `realm`, `nonce`, `qop`, and `opaque` from the header
   - Compute the digest response using Node's built-in `crypto` module:
     - `HA1 = md5(username:realm:password)`
     - `HA2 = md5(method:uri)`
     - `response = md5(HA1:nonce:nc:cnonce:qop:HA2)`
   - Retry the request with the `Authorization: Digest ...` header
5. Export the same public API that `hikvision.ts` currently exposes — do not change function signatures

### Remove dependencies

In `fdc-lan-bridge/package.json`:
- Remove `digest-fetch` from `dependencies`
- Remove `node-fetch` from `dependencies`

Then run `npm install` to update the lockfile.

## Verification

```bash
cd fdc-lan-bridge && npm install && npm run build && npx jest --runInBand
```

## Do NOT

- Add any new npm dependencies — use only Node built-ins (`crypto`, global `fetch`)
- Change the public API of hikvision.ts (function names, parameters, return types)
- Modify any files outside of `fdc-lan-bridge/`
