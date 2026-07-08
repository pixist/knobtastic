#!/usr/bin/env bash
# Blocks until the knobtastic token block in the given CSS file changes,
# i.e. until the user clicks "Commit to source" in the panel.
#
# Usage: wait-for-commit.sh path/to/globals.css [timeout-seconds]
# Exit 0 = tokens changed. Exit 2 = timed out (default 1800s).

set -eu

file="$1"
timeout="${2:-1800}"

sig() {
  sed -n '/knobtastic:tokens:start/,/knobtastic:tokens:end/p' "$file" | sha1sum
}

start=$(date +%s)
initial=$(sig)

while [ "$(sig)" = "$initial" ]; do
  if [ $(($(date +%s) - start)) -ge "$timeout" ]; then
    echo "timed out waiting for Knobtastic commit" >&2
    exit 2
  fi
  sleep 2
done

echo "knobtastic tokens committed:"
sed -n '/knobtastic:tokens:start/,/knobtastic:tokens:end/p' "$file"
