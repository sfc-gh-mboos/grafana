#!/bin/bash
set -e
cd /workspace
git fetch origin && git reset --hard origin/main
exec cursor-agent private-worker start \
  --worker-dir /workspace \
  --management-addr ":8080" \
  --idle-release-timeout "${IDLE_TIMEOUT:-600}"
