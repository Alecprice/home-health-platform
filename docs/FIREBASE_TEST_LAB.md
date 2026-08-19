# Firebase Test Lab lane

Firebase Test Lab is optional for broad Android regression coverage after a debug/test APK builds locally.

Recommended test matrix for this project:

- Pixel Tablet / recent supported Android image
- one Android 12 / API 31-class device for the preferred on-device speech baseline
- current Android stable image
- portrait and landscape coverage

Manual scenarios before automating UI tests:

1. Fresh install and permission denial/acceptance paths.
2. EVV check-in/check-out and invalid chronology attempts.
3. App background/restore while camera/document scanner is open.
4. Offline chart autosave, app kill, restart, and recovery.
5. Voice dictation start/stop, rapid repeated taps, navigation during recognition.
6. Wrong-patient document mismatch and manual document-identity confirmation.
7. Field-work receipt capture and process-death recovery.

Do not use real PHI in Firebase Test Lab or any other development-device cloud test environment.
