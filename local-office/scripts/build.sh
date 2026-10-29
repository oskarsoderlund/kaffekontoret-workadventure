#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
# Match frontend to the existing, pinned backend protocol rather than bypassing its check.
docker run --rm --entrypoint cat kk-wa-play:pilot-base /usr/src/libs/messages/src/JsonMessages/ApiVersion.ts > libs/messages/src/JsonMessages/ApiVersion.ts
npm run typesafe-i18n --workspace=workadventure-play
npm run build-iframe-api --workspace=workadventure-play
GENERATE_SOURCEMAP=false npm run build --workspace=workadventure-play
python3 local-office/scripts/export-source.py
node local-office/bridge/service.mjs stop
node local-office/bridge/service.mjs start
docker compose -f local-office/compose.yaml restart play
