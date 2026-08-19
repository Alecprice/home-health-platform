import { App, type RestoredListenerEvent } from '@capacitor/app';
import type { MediaResult } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { db } from '../offline/db';
import { createUuid } from '../utils/id';
import { persistReceiptMedia } from './receipt';

let initialized = false;
let initializing: Promise<void> | null = null;

function boundedText(value: unknown, max: number): string | undefined {
  return typeof value === 'string' && value.length ? value.slice(0, max) : undefined;
}

async function recoverKnownResult(event: RestoredListenerEvent) {
  if (!event.success || !event.data || typeof event.data !== 'object') return;

  if (event.pluginId === 'Camera' && event.methodName === 'takePhoto') {
    const receipt = await persistReceiptMedia(event.data as Partial<MediaResult>);
    await db.nativeRecoveries.add({
      id: createUuid(), kind: 'receipt', status: 'pending', createdAt: new Date().toISOString(),
      name: receipt.name, uri: receipt.uri, previewUrl: receipt.previewUrl, persistent: receipt.persistent
    });
    return;
  }

  if (event.pluginId === 'ClinicalAssist' && event.methodName === 'scanDocument') {
    const data = event.data as Record<string, unknown>;
    const pageCount = Number(data.pageCount);
    const failedPageCount = Number(data.failedPageCount);
    await db.nativeRecoveries.add({
      id: createUuid(), kind: 'document-scan', status: 'pending', createdAt: new Date().toISOString(),
      ocrText: boundedText(data.ocrText, 100_000),
      pdfUri: boundedText(data.pdfUri, 4096),
      pageCount: Number.isInteger(pageCount) && pageCount >= 0 ? pageCount : undefined,
      failedPageCount: Number.isInteger(failedPageCount) && failedPageCount >= 0 ? failedPageCount : undefined,
      ocrTruncated: data.ocrTruncated === true
    });
  }
}

export async function initializeNativeRecovery(): Promise<void> {
  if (initialized || !Capacitor.isNativePlatform()) return;
  if (initializing) return initializing;
  initializing = (async () => {
    await App.addListener('appRestoredResult', event => {
      void recoverKnownResult(event).catch(() => console.error('Unable to persist a restored native result.'));
    });
    initialized = true;
  })();
  try { await initializing; }
  finally { initializing = null; }
}
