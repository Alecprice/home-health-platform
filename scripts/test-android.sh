#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID="$ROOT/web/android"
if [ ! -x "$ANDROID/gradlew" ]; then
  echo "Android project is not generated yet. Run ./scripts/bootstrap-android.sh first." >&2
  exit 2
fi
cd "$ANDROID"
./gradlew assembleDebug
