#!/bin/sh
set -eu

pilot_url="${1:?Usage: smoke-test.sh https://pilot.example}"
pilot_url="${pilot_url%/}"

health="$(curl --fail --silent --show-error "$pilot_url/health")"
printf '%s\n' "$health" | grep -q '"service":"kk-wa-edge"'
printf '%s\n' "$health" | grep -q '"status":"ok"'

pilot_health="$(curl --fail --silent --show-error "$pilot_url/api/pilot/health")"
printf '%s\n' "$pilot_health" | grep -q '"status":"ready"'

html="$(curl --fail --silent --show-error "$pilot_url/")"
printf '%s\n' "$html" | grep -q 'Kaffekontoret'

maps="$(curl --fail --silent --show-error "$pilot_url/map-storage/maps")"
printf '%s\n' "$maps" | grep -q 'kaffekontoret/map.wam'

wam="$(curl --fail --silent --show-error "$pilot_url/map-storage/kaffekontoret/map.wam")"
printf '%s\n' "$wam" | grep -Eq '"mapUrl"[[:space:]]*:[[:space:]]*"[^" ]*/map\.tmj"'

printf '%s\n' "Kaffekontoret Railway smoke test passed: $pilot_url"
