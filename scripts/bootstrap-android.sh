#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
[ -f .env ] || cp .env.example .env
npm install
npm run verify
cd web
if [ ! -f android/gradlew ]; then
  if [ -d android ] && find android -mindepth 1 -maxdepth 1 ! -name README.md -print -quit | grep -q .; then
    echo "web/android contains files but no Gradle wrapper. Refusing to delete a possibly customized Android project." >&2
    echo "Move/repair that directory manually, then rerun this script." >&2
    exit 2
  fi
  rm -rf android
  npx cap add android
fi
cd "$ROOT"
python3 scripts/configure_android.py
cd web
npx cap sync android
cd "$ROOT"
if [ -n "${ANDROID_HOME:-}" ] || [ -n "${ANDROID_SDK_ROOT:-}" ] || [ -f web/android/local.properties ]; then
  bash scripts/test-android.sh
else
  echo "Android SDK path is not configured yet; debug Gradle compile will run after Android Studio setup via: npm run android:test"
fi
cd web
npx cap open android
