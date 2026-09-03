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

exec gosu node npm run start
