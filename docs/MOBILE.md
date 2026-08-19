# Android mobile implementation

The product is Android-tablet first. React/Vite remains the primary UI and Capacitor provides native access only where needed.

## Native feature boundary

`web/src/native/` contains small TypeScript adapters:

- `evv.ts` — official Capacitor Geolocation; precise check-in/check-out capture
- `receipt.ts` — official Capacitor Camera; receipt photos without saving them to the gallery
- `clinicalAssist.ts` — local `ClinicalAssist` bridge for Android speech + document scan/OCR

Native Java templates live under `native/android/app/`. `scripts/configure_android.py` copies and registers them after Capacitor generates `web/android/`. This keeps generated Android files reproducible and lets us replace/revert native implementations later.

## Speech privacy default

On Android, the app only starts `SpeechRecognizer.createOnDeviceSpeechRecognizer()` when Android reports on-device recognition is available (API 31+). The native bridge intentionally does **not** fall back to the generic network-capable recognizer. Unsupported tablets fall back to manual entry.

Patient-response capture requires a clinician acknowledgement checkbox before listening starts. The current implementation transcribes live speech and does not retain a raw audio file.

## Documents

The ML Kit scanner provides the capture/gallery/crop/cleanup flow and returns JPEG/PDF. Each scanned JPEG page is then passed through bundled Latin Text Recognition v2. OCR text returns to React and goes through the same review/suggestion pipeline as voice.

The scanner portion is delivered through Google Play services, so the first scanner invocation can require its module to download. Bundled OCR itself is packaged with the APK.

## EVV

Check-in/out stores timestamp, latitude, longitude, and reported accuracy in Dexie immediately. Migration `005_evv_events.sql` provides an append-only server-side event model for later sync while keeping convenience check-in/out fields on `visits`.

## First physical-device verification

Run `./scripts/bootstrap-android.sh`, let Android Studio complete SDK/Gradle sync, connect an Android 12+ tablet with USB debugging, then verify:

1. precise location permission and EVV check-in/out
2. microphone permission and on-device dictation
3. patient-response acknowledgement + transcription
4. scanner launch, multi-page scan, OCR, PDF URI
5. receipt camera capture
6. offline draft and EVV persistence after app restart
7. portrait/landscape tablet layout

No native build has been claimed successful until this pass is completed on a real device/emulator.

## v0.4 lifecycle hardening

- Camera/scanner `appRestoredResult` recovery is registered before React renders so Android process death during an external Activity has a recovery path.
- Speech start/stop transitions are serialized and late callbacks are ignored after mode/navigation changes.
- A recognizer that fails to finish after `stopListening()` is explicitly cancelled after a short final-result grace period.
- OCR is sequential rather than concurrent across full-resolution pages and is capped at 100,000 returned characters.
- Scanner PDF URIs are temporary references in this build; durable encrypted document storage is still future work.

After the Android SDK is configured, `npm run android:test` runs `./gradlew assembleDebug` as a repeatable native compile gate.
