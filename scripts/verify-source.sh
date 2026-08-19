#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "[1/8] shell syntax"
while IFS= read -r file; do bash -n "$file"; done < <(find scripts -maxdepth 1 -name '*.sh' -type f | sort)

echo "[2/8] python syntax"
python3 -m py_compile scripts/configure_android.py

echo "[3/8] JSON parse"
python3 - <<'PY'
from pathlib import Path
import json
for p in Path('.').rglob('*.json'):
    if 'node_modules' in p.parts or 'android' in p.parts:
        continue
    json.loads(p.read_text())
print('JSON_OK')
PY

echo "[4/8] migration numbering and security invariants"
python3 - <<'PY'
from pathlib import Path
import re
migs=sorted(Path('database/migrations').glob('*.sql'))
nums=[int(p.name.split('_',1)[0]) for p in migs]
assert nums == list(range(nums[0], nums[0]+len(nums))), f'non-contiguous migrations: {nums}'
all_sql='\n'.join(p.read_text().lower() for p in migs)
hard=Path('database/migrations/006_hardening.sql').read_text().lower()
align=Path('database/migrations/007_clinical_usability_alignment.sql').read_text().lower()
evvguard=Path('database/migrations/008_evv_sequence_guard.sql').read_text().lower()
assert 'force row level security' in hard
assert 'nobypassrls' in Path('database/bootstrap/000_local_app_role.sql').read_text().lower()
assert 'prevent_signed_note_edit' in hard
assert 'assert_amendment_target' in hard
assert 'revoke update, delete, truncate' in hard
assert 'security definer set search_path = pg_catalog, public' in hard
assert 'revoke execute on function apply_evv_event_to_visit() from public' in hard
assert 'grant update (patient_id, episode_id, clinician_id, scheduled_at, discipline, visit_type, status) on visits' in hard
assert 'prevent_workflow_definition_rewrite' in hard
assert 'revoke delete on workflow_profiles' in hard
assert 'revoke delete on visits' in hard
assert 'allergy_status' in align and 'patient_identity_confirmed' in align and 'patient_response' in align and 'patient_response_transcription_acknowledged_at' in align
assert 'enforce_evv_capture_sequence' in evvguard and 'pg_advisory_xact_lock' in evvguard
compose=Path('docker-compose.yml').read_text()
assert '127.0.0.1:' in compose
example=Path('.env.example').read_text()
assert 'homehealth_app' in example and 'homehealth_admin' in example
roles=Path('database/migrations/009_user_roles.sql').read_text().lower()
assert "add value if not exists 'qa_reviewer'" in roles and "add value if not exists 'clinical_manager'" in roles
clinical=Path('database/migrations/010_clinical_context_and_qa.sql').read_text().lower()
assert 'create table medications' in clinical and 'create table plans_of_care' in clinical and 'create table clinical_orders' in clinical
assert 'create table assessment_instances' in clinical and 'create table qa_reviews' in clinical and 'create table signature_attestations' in clinical
assert 'force row level security' in clinical and 'signature_attestations_append_only' in clinical
assert 'finalize_clinical_note' in clinical and 'revoke update on clinical_notes from homehealth_app' in clinical
assert 'security definer' in clinical and 'grant execute on function finalize_clinical_note' in clinical
assert "current_setting('app.current_agency_id'" in clinical and "current_setting('app.current_user_id'" in clinical
assert 'revoke insert on clinical_notes from homehealth_app' in clinical
print('DB_STATIC_INVARIANTS_OK')
PY

echo "[5/8] Android patcher idempotency/safety smoke"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/web/android/app/src/main/java/com/homehealth/clinical" "$TMP/web/android/app/src/main" "$TMP/web/android/app"
touch "$TMP/web/android/gradlew"
cat > "$TMP/web/android/app/build.gradle" <<'EOF'
plugins { id 'com.android.application' }
android { namespace "com.homehealth.clinical" }
dependencies {
}
EOF
cat > "$TMP/web/android/app/src/main/AndroidManifest.xml" <<'EOF'
<manifest xmlns:android="http://schemas.android.com/apk/res/android"><application><activity android:name=".MainActivity" /></application></manifest>
EOF
cat > "$TMP/web/android/app/src/main/java/com/homehealth/clinical/MainActivity.java" <<'EOF'
package com.homehealth.clinical;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {}
EOF
mkdir -p "$TMP/native/android/app" "$TMP/scripts"
cp native/android/app/*.java "$TMP/native/android/app/"
cp scripts/configure_android.py "$TMP/scripts/"
(cd "$TMP" && python3 scripts/configure_android.py >/dev/null && python3 scripts/configure_android.py >/dev/null)
python3 - "$TMP" <<'PY'
from pathlib import Path
import sys
r=Path(sys.argv[1])
g=(r/'web/android/app/build.gradle').read_text()
m=(r/'web/android/app/src/main/AndroidManifest.xml').read_text()
a=(r/'web/android/app/src/main/java/com/homehealth/clinical/MainActivity.java').read_text()
assert g.count('HOME_HEALTH_NATIVE_DEPS_START') == 1
assert m.count('android.permission.RECORD_AUDIO') == 1
assert m.count('android:screenOrientation="locked"') == 1
assert a.count('registerPlugin(ClinicalAssistPlugin.class)') == 1
print('ANDROID_PATCHER_OK')
PY

echo "[6/8] source safety scan"
if grep -RInE --exclude-dir=node_modules --exclude-dir=android --exclude='verify-source.sh' '(Math\.random\(|DATABASE_URL=.*postgres:postgres|CameraSource\.|source:[[:space:]]*CameraSource)' web api database scripts .env.example docker-compose.yml; then
  echo "Unsafe source pattern found" >&2
  exit 1
fi

echo "[7/8] TypeScript syntax scan"
if command -v tsc >/dev/null 2>&1; then
  TSC_OUT="$(mktemp)"
  set +e
  tsc --noEmit --noResolve --jsx react-jsx --target ES2022 --module ESNext --moduleResolution bundler $(find web/src api/src -type f \( -name '*.ts' -o -name '*.tsx' \) -print) >"$TSC_OUT" 2>&1
  set -e
  if grep -Eq 'error TS1[0-9]{3}' "$TSC_OUT"; then
    grep -E 'error TS1[0-9]{3}' "$TSC_OUT" >&2
    rm -f "$TSC_OUT"
    exit 1
  fi
  rm -f "$TSC_OUT"
  echo "TS_SYNTAX_OK"
else
  echo "tsc not available; TypeScript syntax scan skipped"
fi

echo "[8/8] clinician/cognitive-load safety invariants"
python3 - <<'PYUX'
from pathlib import Path
chart=Path('web/src/features/charting/ChartPage.tsx').read_text()
assist=Path('web/src/features/clinical-assist/extraction.ts').read_text()
panel=Path('web/src/features/clinical-assist/ClinicalAssistPanel.tsx').read_text()
dash=Path('web/src/features/dashboard/DashboardPage.tsx').read_text()
workflow=Path('web/src/workflow/config.ts').read_text()
css=Path('web/src/styles.css').read_text()
assert 'steps.map(stepId' in chart, 'workflow lab does not drive actual visit section order'
assert 'patientIdentityConfirmed' in chart and 'storageHealthy' in chart and 'patientResponseTranscriptionAcknowledgedAt' in chart, 'signature readiness guard missing'
assert 'selected: false' in assist, 'assist suggestions must not be preselected'
assert 'Possible wrong-patient source' in panel and 'onPatientResponseAcknowledged' in panel and 'documentVerificationRequired' in panel and 'I verified this document belongs to' in panel, 'Clinical Assist source/acknowledgement guard missing'
assert "where('syncStatus').equals('pending')" in dash, 'dashboard sync queue is not filtered to pending items'
assert "'clinical-context', 'assessment'" in workflow, 'recommended flow must review clinical context before assessment'
assert "'evv-check-out', 'review-sign'" in workflow, 'recommended flow must check out before sign'
assert 'min-height: 48px' in css and ':focus-visible' in css, 'minimum touch/focus accessibility guard missing'
print('CLINICIAN_UX_INVARIANTS_OK')
PYUX

echo "SOURCE_VERIFY_PASS"
