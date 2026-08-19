# Development quick start

## Browser demo

```bash
cd home-health-platform
./scripts/bootstrap.sh
npm run dev:web
```

The UI uses synthetic data. Browser mode is useful for workflow iteration; native scanner/on-device speech require Android.

## Android tablet

Install Android Studio, then run:

```bash
./scripts/bootstrap-android.sh
```

The script performs npm install, Vite build, `cap add android` on first use, the reproducible native patch (`scripts/configure_android.py`), Capacitor sync, then opens Android Studio.

Recommended first test device: Android 12+ with Google Play services, GPS, microphone, camera, and at least 4 GB RAM.

## Database/API

Docker is optional for the synthetic UI. When API-backed work begins:

```bash
docker compose up -d
npm run dev:api
```

Do not use real PHI during this stage.

## Hardening commands

```bash
npm run verify          # source + typecheck + unit tests + production builds
npm run verify:full     # above + Docker/Postgres RLS/integrity smoke tests
```

`npm run verify:source` is dependency-light and is useful while package installation is unavailable. The first successful `npm install` should produce a `package-lock.json`; retain it for reproducible installs.

After Android Studio/SDK setup, run `npm run android:test` to force a command-line debug APK compile.
