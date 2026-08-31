#!/bin/sh
set -eu

storage_directory="${STORAGE_DIRECTORY:-/maps}"
install -d -o node -g node "$storage_directory"

exec gosu node npm run start
