#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
command -v tsc >/dev/null 2>&1 || { echo 'tsc not found; install TypeScript or run npm install.' >&2; exit 1; }
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

tsc --target ES2022 --module commonjs --moduleResolution node --rootDir web/src --outDir "$TMP" --skipLibCheck \
  web/src/types/domain.ts \
  web/src/utils/id.ts \
  web/src/workflow/config.ts \
  web/src/workflow/state.ts \
  web/src/workflow/risk.ts \
  web/src/features/charting/noteLogic.ts \
  web/src/features/charting/readiness.ts \
  web/src/features/field-work/fieldWorkLogic.ts \
  web/src/features/clinical-assist/extraction.ts \
  web/src/features/clinical-assist/safety.ts \
  web/src/utils/format.ts

node - "$TMP" <<'NODE'
const path = require('node:path');
const root = process.argv[2];
const note = require(path.join(root, 'features/charting/noteLogic.js'));
const fw = require(path.join(root, 'features/field-work/fieldWorkLogic.js'));
const workflow = require(path.join(root, 'workflow/state.js'));
const workflowRisk = require(path.join(root, 'workflow/risk.js'));
const readiness = require(path.join(root, 'features/charting/readiness.js'));
const extraction = require(path.join(root, 'features/clinical-assist/extraction.js'));
const assistSafety = require(path.join(root, 'features/clinical-assist/safety.js'));
const ids = require(path.join(root, 'utils/id.js'));
function assert(cond, message) { if (!cond) throw new Error(message); }
let groups = 0;

assert(note.parseVitalInput('Infinity') === undefined && note.parseVitalInput('NaN') === undefined && note.parseVitalInput('98.6') === 98.6, 'finite vital parsing');
groups++;

for (let i=0;i<1000;i++) {
  const start = ((i * 7919) % 2000000) / 10;
  const distance = (1 + ((i * 104729) % 1000)) / 10;
  const end = Number((start+distance).toFixed(1));
  const result = fw.calculateMileage({start:String(start), end:String(end), miles:''});
  assert(!result.error && result.miles === Number((end-start).toFixed(1)), 'mileage odometer invariant');
}
assert(fw.calculateMileage({start:'100',end:'',miles:'10'}).error, 'one-sided odometer accepted');
assert(fw.calculateMileage({start:'100',end:'99',miles:''}).error, 'reversed odometer accepted');
assert(fw.parseExpenseAmount('Infinity') === undefined && fw.parseExpenseAmount('-1') === undefined && fw.parseExpenseAmount('12.345') === 12.35, 'expense parsing');
assert(fw.parseExpenseAmount('100000000') === undefined, 'expense DB-overflow amount accepted');
assert(fw.calculateMileage({start:'',end:'',miles:'100001'}).error, 'implausibly huge mileage accepted');
groups++;

const draft=note.createEmptyDraft('v1','p1');
draft.vitals={systolic:80,diastolic:120,pulse:500,spo2:101,pain:11};
assert(note.validateDraft(draft).length === 4, 'draft validation mismatch');
const badPair=note.applyReviewedSuggestions(note.createEmptyDraft('v2','p2'), [
 {id:'1',label:'s',field:'vitals.systolic',value:'80',confidence:.9,source:'voice',selected:true},
 {id:'2',label:'d',field:'vitals.diastolic',value:'120',confidence:.9,source:'voice',selected:true}
]);
assert(badPair.applied===0 && badPair.rejected===2, 'inverted suggestion pair applied');
groups++;

const safe=note.sanitizeStoredDraft({id:'draft-v3',visitId:'v3',patientId:'p3',syncStatus:'bogus',updatedAt:'bad',vitals:{spo2:97,pulse:'x'},narrative:'x'.repeat(60000),patientResponse:'y'.repeat(60000)},'v3','p3');
assert(safe && safe.vitals.spo2===97 && safe.vitals.pulse===undefined && safe.narrative.length===50000 && safe.patientResponse.length===50000, 'stored draft sanitizer');
assert(note.sanitizeStoredDraft({id:'draft-v3',visitId:'v3',patientId:'wrong'},'v3','p3')===undefined, 'cross-patient local draft accepted');
groups++;

const norm=workflow.normalizeStepList(['assessment','assessment','unknown']);
assert(norm && new Set(norm).size===norm.length && norm.includes('patient-review') && norm.includes('clinical-context') && norm.includes('review-sign'), 'workflow corruption recovery');
assert(norm.indexOf('patient-review') < norm.indexOf('assessment') && norm.indexOf('review-sign') > norm.indexOf('assessment'), 'core workflow ordering');
groups++;


const recommended = require(path.join(root, 'workflow/config.js')).recommendedWorkflow;
assert(workflowRisk.analyzeWorkflowRisks(recommended.steps).length===0, 'recommended workflow has known safety ordering risk');
const reversedRisks=workflowRisk.analyzeWorkflowRisks(['patient-review','evv-check-out','assessment','evv-check-in','review-sign']);
const earlySignRisks=workflowRisk.analyzeWorkflowRisks(['patient-review','evv-check-in','assessment','review-sign','evv-check-out']);
assert(reversedRisks.some(x=>x.id==='checkout-before-checkin') && earlySignRisks.some(x=>x.id==='sign-before-checkout'), 'unsafe workflow ordering not detected');
groups++;

const emptyReady=readiness.buildVisitReadiness(note.createEmptyDraft('vr','pr'), {requireCheckIn:true,requireCheckOut:true,checkIn:null,checkOut:null});
assert(readiness.signatureBlockers(emptyReady).length>=4, 'empty note incorrectly ready for signature');
const readyDraft=note.createEmptyDraft('vr2','pr2');
readyDraft.patientIdentityConfirmed=true;
readyDraft.medicationsReviewed=true; readyDraft.ordersReviewed=true; readyDraft.planOfCareReviewed=true; readyDraft.priorContextReviewed=true;
readyDraft.assessmentResponses=[{fieldId:'mental-status',value:'Alert/oriented',updatedAt:'2026-08-18T10:00:00Z'}];
readyDraft.narrative='Skilled visit assessment, interventions, education, patient response, and plan documented.';
readyDraft.interventions='Skilled cardiopulmonary assessment and medication review completed.'; readyDraft.responseToCare='Tolerated well.'; readyDraft.nextVisitPlan='Reassess symptoms and medication response.';
const capture={id:'e',visitId:'vr2',kind:'check-in',capturedAt:'2026-08-18T10:00:00.000Z',latitude:0,longitude:0,accuracyMeters:5,source:'device',syncStatus:'pending'};
const readyItems=readiness.buildVisitReadiness(readyDraft,{requireCheckIn:true,requireCheckOut:true,checkIn:capture,checkOut:{...capture,id:'e2',kind:'check-out',capturedAt:'2026-08-18T11:00:00.000Z'}});
assert(readiness.signatureBlockers(readyItems).length===0, 'complete demo draft not recognized as ready');
assert(readiness.evvChronologyValid(capture,{...capture,id:'bad',kind:'check-out',capturedAt:'2026-08-18T09:00:00.000Z'})===false,'reversed EVV chronology accepted');
const responseDraft=note.createEmptyDraft('vr3','pr3');
responseDraft.patientIdentityConfirmed=true;
responseDraft.medicationsReviewed=true; responseDraft.ordersReviewed=true; responseDraft.planOfCareReviewed=true; responseDraft.priorContextReviewed=true;
responseDraft.assessmentResponses=[{fieldId:'mental-status',value:'Alert/oriented',updatedAt:'2026-08-18T10:00:00Z'}];
responseDraft.interventions='Skilled assessment and teaching provided.'; responseDraft.responseToCare='Patient participated.'; responseDraft.nextVisitPlan='Follow up next visit.';
responseDraft.narrative='Skilled visit assessment, education, response, and plan documented.';
responseDraft.patientResponse='Patient reports pain increases when walking.';
let responseItems=readiness.buildVisitReadiness(responseDraft,{requireCheckIn:false,requireCheckOut:false,checkIn:null,checkOut:null});
assert(responseItems.some(x=>x.id==='patient-response-awareness' && !x.complete),'patient-response transcript did not require persisted acknowledgement');
responseDraft.patientResponseTranscriptionAcknowledgedAt='2026-08-18T20:00:00Z';
responseItems=readiness.buildVisitReadiness(responseDraft,{requireCheckIn:false,requireCheckOut:false,checkIn:null,checkOut:null});
assert(responseItems.some(x=>x.id==='patient-response-awareness' && x.complete),'patient-response acknowledgement not recognized');
groups++;

const out=extraction.extractDeterministicSuggestions('BP 80/120 pulse 999 SpO2 180 pain 99 temp 200', 'document');
assert(out.length===0, 'out-of-range OCR values suggested');
const valid=extraction.extractDeterministicSuggestions('BP 128/76 pulse 72 SpO2 97% pain 4/10 temp 98.6 F MRN ABC-123 M17.11 DOB 03/14/1948 U07.1', 'document');
assert(valid.some(x=>x.field==='vitals.systolic') && valid.some(x=>x.field==='patient.mrn'), 'valid extraction missed');
assert(valid.some(x=>x.field==='patient.primaryDiagnosisCode' && x.value==='M17.11'), 'ICD extraction missed');
assert(valid.every(x=>x.selected===false), 'extracted suggestions were preselected, risking automation bias');
assert(extraction.extractDeterministicSuggestions('DOB 99/99/2020', 'document').every(x=>x.field!=='patient.dob'), 'invalid DOB suggested');
assert(extraction.extractDeterministicSuggestions('diagnosis U07.1', 'document').some(x=>x.value==='U07.1'), 'U-code extraction missed');
groups++;


const demoPatient={id:'p',mrn:'ABC-123',firstName:'A',lastName:'B',dob:'1948-03-14',primaryDiagnosis:'x',primaryDiagnosisCode:'X00',payer:'demo',phone:'',address:'',physician:'',allergies:[],allergyStatus:'nkda'};
const mk=(field,value)=>({id:field,label:field,field,value,confidence:.9,source:'document',selected:false});
assert(assistSafety.sourceIdentityWarnings(demoPatient,[mk('patient.mrn','abc123'),mk('patient.dob','03/14/1948')]).length===0,'matching document identity flagged');
assert(assistSafety.sourceIdentityWarnings(demoPatient,[mk('patient.mrn','XYZ999')]).length===1,'wrong-patient MRN not blocked');
groups++;

const generated = new Set();
for (let i=0;i<1000;i++) { const id=ids.createUuid(); assert(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id), 'invalid uuid'); generated.add(id); }
assert(generated.size===1000,'uuid collision');
groups++;

console.log(`PURE_LOGIC_TESTS_PASS=${groups}`);
NODE
