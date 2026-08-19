import Dexie, { type EntityTable } from 'dexie';
import type { ClinicalNoteDraft, EvvCapture, FieldExpense, MileageLog } from '../types/domain';

export interface NativeRecoveryItem {
  id: string;
  kind: 'receipt' | 'document-scan';
  createdAt: string;
  status: 'pending' | 'consumed';
  name?: string;
  uri?: string;
  previewUrl?: string;
  persistent?: boolean;
  ocrText?: string;
  pdfUri?: string;
  pageCount?: number;
  failedPageCount?: number;
  ocrTruncated?: boolean;
}

interface PendingAssistItem {
  id: string;
  patientId: string;
  visitId?: string;
  source: 'voice' | 'document';
  createdAt: string;
  status: 'needs-review' | 'accepted' | 'rejected';
  rawText: string;
}

export const db = new Dexie('HomeHealthClinical') as Dexie & {
  drafts: EntityTable<ClinicalNoteDraft, 'id'>;
  assistQueue: EntityTable<PendingAssistItem, 'id'>;
  mileageLogs: EntityTable<MileageLog, 'id'>;
  fieldExpenses: EntityTable<FieldExpense, 'id'>;
  evvCaptures: EntityTable<EvvCapture, 'id'>;
  nativeRecoveries: EntityTable<NativeRecoveryItem, 'id'>;
};

db.version(1).stores({
  drafts: 'id, visitId, patientId, updatedAt, syncStatus',
  assistQueue: 'id, patientId, visitId, createdAt, status, source'
});

db.version(2).stores({
  drafts: 'id, visitId, patientId, updatedAt, syncStatus',
  assistQueue: 'id, patientId, visitId, createdAt, status, source',
  mileageLogs: 'id, date, visitId, patientId, vehicleType, createdAt',
  fieldExpenses: 'id, date, visitId, patientId, category, createdAt'
});

db.version(3).stores({
  drafts: 'id, visitId, patientId, updatedAt, syncStatus',
  assistQueue: 'id, patientId, visitId, createdAt, status, source',
  mileageLogs: 'id, date, visitId, patientId, vehicleType, createdAt',
  fieldExpenses: 'id, date, visitId, patientId, category, createdAt',
  evvCaptures: 'id, visitId, kind, capturedAt'
});

// Compound visit/kind index makes "latest check-in/check-out" deterministic and efficient.
db.version(4).stores({
  drafts: 'id, visitId, patientId, updatedAt, syncStatus',
  assistQueue: 'id, patientId, visitId, createdAt, status, source',
  mileageLogs: 'id, date, visitId, patientId, vehicleType, createdAt',
  fieldExpenses: 'id, date, visitId, patientId, category, createdAt',
  evvCaptures: 'id, visitId, kind, capturedAt, [visitId+kind]'
});

// v5 stores Android external-Activity results recovered after OS process death.
db.version(5).stores({
  drafts: 'id, visitId, patientId, updatedAt, syncStatus',
  assistQueue: 'id, patientId, visitId, createdAt, status, source',
  mileageLogs: 'id, date, visitId, patientId, vehicleType, createdAt',
  fieldExpenses: 'id, date, visitId, patientId, category, createdAt',
  evvCaptures: 'id, visitId, kind, capturedAt, syncStatus, [visitId+kind]',
  nativeRecoveries: 'id, kind, status, createdAt, [kind+status]'
});


// v6 adds EVV sync-state indexing so the dashboard queue reflects only unsynced events.
db.version(6).stores({
  drafts: 'id, visitId, patientId, updatedAt, syncStatus',
  assistQueue: 'id, patientId, visitId, createdAt, status, source',
  mileageLogs: 'id, date, visitId, patientId, vehicleType, createdAt',
  fieldExpenses: 'id, date, visitId, patientId, category, createdAt',
  evvCaptures: 'id, visitId, kind, capturedAt, syncStatus, [visitId+kind]',
  nativeRecoveries: 'id, kind, status, createdAt, [kind+status]'
}).upgrade(async tx => {
  await tx.table('evvCaptures').toCollection().modify(row => {
    if (row.syncStatus !== 'synced') row.syncStatus = 'pending';
  });
});
