#!/usr/bin/env python3
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parents[1]
ANDROID = ROOT / 'web' / 'android'
APP = ANDROID / 'app'
PKG = APP / 'src' / 'main' / 'java' / 'com' / 'homehealth' / 'clinical'
TEMPLATES = ROOT / 'native' / 'android' / 'app'

if not (ANDROID / 'gradlew').exists():
    sys.exit('Android project not generated. Run npx cap add android first.')

PKG.mkdir(parents=True, exist_ok=True)
for name in ('ClinicalAssistPlugin.java', 'DocumentScanActivity.java'):
    shutil.copy2(TEMPLATES / name, PKG / name)

main_activity = PKG / 'MainActivity.java'
main_template = '''package com.homehealth.clinical;\n\nimport android.os.Bundle;\nimport com.getcapacitor.BridgeActivity;\n\npublic class MainActivity extends BridgeActivity {\n    // HOME_HEALTH_NATIVE_PLUGIN_START\n    @Override\n    public void onCreate(Bundle savedInstanceState) {\n        registerPlugin(ClinicalAssistPlugin.class);\n        super.onCreate(savedInstanceState);\n    }\n    // HOME_HEALTH_NATIVE_PLUGIN_END\n}\n'''
if not main_activity.exists():
    main_activity.write_text(main_template)
else:
    existing = main_activity.read_text()
    if 'registerPlugin(ClinicalAssistPlugin.class)' not in existing:
        compact = ''.join(existing.split())
        generated_minimal = 'publicclassMainActivityextendsBridgeActivity{}' in compact
        if not generated_minimal:
            sys.exit('MainActivity.java contains custom code. Refusing to overwrite it; register ClinicalAssistPlugin manually.')
        main_activity.write_text(main_template)

# Patch app/build.gradle idempotently.
gradle = APP / 'build.gradle'
s = gradle.read_text()
start = '// HOME_HEALTH_NATIVE_DEPS_START'
end = '// HOME_HEALTH_NATIVE_DEPS_END'
block = """// HOME_HEALTH_NATIVE_DEPS_START
    implementation 'com.google.android.gms:play-services-mlkit-document-scanner:16.0.0'
    implementation 'com.google.mlkit:text-recognition:16.0.1'
// HOME_HEALTH_NATIVE_DEPS_END"""
if start in s:
    before, rest = s.split(start, 1)
    if end not in rest:
        sys.exit('Found start marker without end marker in app/build.gradle')
    _, after = rest.split(end, 1)
    s = before + block + after
else:
    idx = s.find('dependencies {')
    if idx == -1:
        sys.exit('Could not find dependencies block in app/build.gradle')
    insert_at = idx + len('dependencies {')
    s = s[:insert_at] + '\n    ' + block.replace('\n', '\n    ') + s[insert_at:]
gradle.write_text(s)

manifest = APP / 'src' / 'main' / 'AndroidManifest.xml'
s = manifest.read_text()
perm_marker = '<!-- HOME_HEALTH_NATIVE_PERMISSIONS -->'
permissions = '''<!-- HOME_HEALTH_NATIVE_PERMISSIONS -->
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-feature android:name="android.hardware.location.gps" android:required="false" />
    <queries>
        <intent><action android:name="android.speech.RecognitionService" /></intent>
    </queries>'''
if perm_marker not in s:
    if '<application' not in s:
        sys.exit('Could not find <application> in AndroidManifest.xml')
    s = s.replace('<application', permissions + '\n\n    <application', 1)

activity_marker = '<!-- HOME_HEALTH_DOCUMENT_SCAN_ACTIVITY -->'
activity = '''<!-- HOME_HEALTH_DOCUMENT_SCAN_ACTIVITY -->
        <activity
            android:name=".DocumentScanActivity"
            android:exported="false"
            android:screenOrientation="locked"
            android:theme="@style/AppTheme.NoActionBar" />'''
if activity_marker not in s:
    if '</application>' not in s:
        sys.exit('Could not find </application> in AndroidManifest.xml')
    s = s.replace('</application>', '        ' + activity.replace('\n', '\n        ') + '\n    </application>', 1)
manifest.write_text(s)

print('Configured Android native integrations without overwriting unknown MainActivity customizations.')
