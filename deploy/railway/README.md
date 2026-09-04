# Railway deployment adapter

This adapter keeps the WorkAdventure core unchanged while exposing its multi-port services through one Railway domain.

## Services

| Service | Source | Public | Persistent storage |
| --- | --- | --- | --- |
| `kk-wa-edge` | `deploy/railway/edge/Dockerfile` | Port 8080 | No |
| `kk-wa-play` | `play/Dockerfile` | No | No |
| `kk-wa-back` | `back/Dockerfile` | No | No |
| `kk-wa-map-storage` | `map-storage/Dockerfile` | No | `/maps` volume |
| `kk-wa-redis` | Pinned Redis 6 image | No | Railway volume |
| `kk-wa-icon` | Pinned iconserver image | No | No |

Railway only exposes one target port per generated domain. WorkAdventure needs HTTP on port 3000 and websocket traffic on port 3001, plus path routing to its backend and map storage. `kk-wa-edge` provides that routing without changing the application code.

Railway mounts volumes as `root`. The map-storage entrypoint fixes ownership on `/maps` and immediately drops privileges to the `node` user before starting the service.

`GET /health` reports the pinned WorkAdventure SHA and the deployed fork commit. Edge access logs are emitted as JSON to standard output. Authentication headers, websocket JWTs, selected query parameters and precise client IP addresses are removed or masked before encoding.

## Edge routing

- `/ws/*` to `kk-wa-play:3001`
- `/api/pilot/*` to `kaffekontoret-pilot-backend:3000` (prefix preserved)
- `/api/*` to `kk-wa-back:8080`, stripping `/api`
- `/map-storage/*` to `kk-wa-map-storage:3000`, stripping `/map-storage`
- `/icon/*` and `/lettericons/*` to `kk-wa-icon:8080`
- all other traffic to `kk-wa-play:3000`

Set these edge variables to the corresponding Railway private hostnames:

- `WA_PLAY_HOST`
- `WA_BACK_HOST`
- `WA_MAP_STORAGE_HOST`
- `WA_ICON_HOST`
- `WA_PILOT_BACKEND_HOST`

## Pilot map seed

On a fresh map-storage volume the image seeds the WorkAdventure pair `maps/kaffekontoret/map.wam` + `map.tmj` and the licensed starter assets. Existing maps are never overwritten, except for one-time migrations of the previous generated pilot versions (identified by their generated descriptions) to the current 96x64 layout. Point `START_ROOM_URL` at `/_/global/<edge-host>/map-storage/kaffekontoret/map.wam` only after verifying the edge route and the seeded volume. The larger map keeps the central office, adds focus rooms where SPACE zooms the camera, and leaves broad walkable areas for collaborative building with explicit doorways between pods.

The small chill room is also marked as the pilot's room-music zone. Set the optional `KAFFEKONTORET_ROOM_MUSIC_URL` variable on `kk-wa-play` to a direct audio URL (MP3/stream) that Kaffekassan is licensed to play. The client loops it at 35% volume while a player is inside the zone and stops it on exit. Browsers may require one initial click/interaction before allowing sound.

## Guardrails

- Deploy this branch to new services only. Do not connect it to the existing `minecraft-kk` service.
- Keep the edge as the only public WorkAdventure service.
- Attach the map-storage volume before full-team activation.
- Keep business integrations and activity data in the separate private pilot backend, not in this public fork.
- Do not use this internal pilot as a paid external service without a separate license decision.

Run `deploy/railway/smoke-test.sh https://<pilot-domain>` after a deployment. It checks edge health, pilot-backend readiness through the edge, branded client shell, seeded map index and the `.wam` → `.tmj` map pair without reading any secrets.

## Pilot authentication

The Kaffekontoret fork supports an explicit allowlist on top of OpenID Connect. Set `DISABLE_ANONYMOUS=true` and configure Google OIDC with the existing `OPENID_*` variables. Then set one or both of:

- `AUTHENTICATION_ALLOWED_EMAILS` for consultants and individually invited guests.
- `AUTHENTICATION_ALLOWED_EMAIL_DOMAINS` for company-managed domains.

Both values are comma-separated. Matching is case-insensitive and exact, so `kaffekassan.se` does not allow `notkaffekassan.se`. If both allowlists are empty, the upstream unrestricted OIDC behavior remains active. Production must not enable mandatory login until at least one allowlist is populated and tested with both an allowed and a denied account.

Set the same randomly generated `PILOT_SESSION_SECRET` on `kk-wa-play` and the separate pilot-backend. After an authenticated user enters the workspace, the client exchanges its WorkAdventure session at `/pilot/session`; the activity extension receives a short-lived pilot token plus a separate extension-attestation token through the scoped content bridge. The backend requires both for activity reporting.

Set `PILOT_WORKSPACE_ID` to the same stable value on `kk-wa-play` and the pilot-backend. The pusher only mints a 60-second consent context after verifying that the requester and recipient are in the same live server-authoritative proximity group.

The pilot-backend must run with `PILOT_RUNTIME_MODE=pilot`, private `DATABASE_URL` and `REDIS_URL`, `GUEST_TOKEN_SECRET`, `PILOT_SESSION_SECRET`, `PILOT_ACTIVITY_POLICY_JSON`, and `PILOT_ACTIVITY_POLICY_PUBLIC_KEY`. Set `PILOT_ALLOWED_ORIGINS` to the exact extension origin after the extension ID is known. Run `npm run migrate` once before enabling the service.
