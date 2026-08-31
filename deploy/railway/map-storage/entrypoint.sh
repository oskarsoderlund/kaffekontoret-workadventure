#!/bin/sh
set -eu

storage_directory="${STORAGE_DIRECTORY:-/maps}"
install -d -o node -g node "$storage_directory"
if [ -d "$storage_directory/lost+found" ]; then
    chown node:node "$storage_directory/lost+found"
fi

exec gosu node npm run start
