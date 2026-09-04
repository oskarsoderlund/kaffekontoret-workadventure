#!/bin/sh
set -eu

storage_directory="${STORAGE_DIRECTORY:-/maps}"
install -d -o node -g node "$storage_directory"
if [ -d "$storage_directory/lost+found" ]; then
    chown node:node "$storage_directory/lost+found"
fi

# Seed the internal pilot map only on a fresh volume. Existing user-authored maps remain untouched.
if [ ! -f "$storage_directory/kaffekontoret/map.wam" ] && [ -d "/opt/seed/kaffekontoret" ]; then
    cp -R /opt/seed/kaffekontoret "$storage_directory/kaffekontoret"
    if [ -d "/opt/seed/assets" ] && [ ! -d "$storage_directory/assets" ]; then
        cp -R /opt/seed/assets "$storage_directory/assets"
    fi
    chown -R node:node "$storage_directory/kaffekontoret" "$storage_directory/assets"
fi

# Migrate only the previous generated Kaffekontoret pilot map. A map editor upload
# is never overwritten: the old generated map is identified by its unique description.
if [ -f "$storage_directory/kaffekontoret/map.tmj" ] && [ -f "/opt/seed/kaffekontoret/map.tmj" ]; then
    if grep -q 'central kontorsyta och tomma expansionsvingar' "$storage_directory/kaffekontoret/map.tmj" \
        && grep -q '"mapVersion"' "/opt/seed/kaffekontoret/map.tmj"; then
        cp "/opt/seed/kaffekontoret/map.tmj" "$storage_directory/kaffekontoret/map.tmj"
        cp "/opt/seed/kaffekontoret/map.wam" "$storage_directory/kaffekontoret/map.wam"
        chown node:node "$storage_directory/kaffekontoret/map.tmj" "$storage_directory/kaffekontoret/map.wam"
    fi

    # Keep generated pilot maps in sync with layout and room-music fixes.
    # A user-authored map normally changes the generated description, so it is left alone.
    if sed -n '/"name"[[:space:]]*:[[:space:]]*"mapVersion"/,+2p' "$storage_directory/kaffekontoret/map.tmj" | grep -Eq '"value"[[:space:]]*:[[:space:]]*[23]' \
        && grep -q 'fokusrum och fria byggzoner' "$storage_directory/kaffekontoret/map.tmj" \
        && sed -n '/"name"[[:space:]]*:[[:space:]]*"mapVersion"/,+2p' "/opt/seed/kaffekontoret/map.tmj" | grep -q '"value"[[:space:]]*:[[:space:]]*4'; then
        cp "/opt/seed/kaffekontoret/map.tmj" "$storage_directory/kaffekontoret/map.tmj"
        cp "/opt/seed/kaffekontoret/map.wam" "$storage_directory/kaffekontoret/map.wam"
        chown node:node "$storage_directory/kaffekontoret/map.tmj" "$storage_directory/kaffekontoret/map.wam"
    fi
fi

exec gosu node npm run start
