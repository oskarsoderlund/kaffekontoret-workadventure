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

## Edge routing

- `/ws/*` to `kk-wa-play:3001`
- `/api/*` to `kk-wa-back:8080`, stripping `/api`
- `/map-storage/*` to `kk-wa-map-storage:3000`, stripping `/map-storage`
- `/icon/*` and `/lettericons/*` to `kk-wa-icon:8080`
- all other traffic to `kk-wa-play:3000`

Set these edge variables to the corresponding Railway private hostnames:

- `WA_PLAY_HOST`
- `WA_BACK_HOST`
- `WA_MAP_STORAGE_HOST`
- `WA_ICON_HOST`

## Guardrails

- Deploy this branch to new services only. Do not connect it to the existing `minecraft-kk` service.
- Keep the edge as the only public WorkAdventure service.
- Attach the map-storage volume before full-team activation.
- Keep business integrations and activity data in the separate private pilot backend, not in this public fork.
- Do not use this internal pilot as a paid external service without a separate license decision.
