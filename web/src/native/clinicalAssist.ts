import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export type SpeechPurpose = 'clinician-dictation' | 'patient-response';

interface SpeechEvent { transcript: string; confidence?: number }
export interface ScanResult { ocrText: string; pdfUri?: string; pageCount: number; failedPageCount?: number; ocrTruncated?: boolean }

interface ClinicalAssistNativePlugin {
  getCapabilities(): Promise<{ onDeviceSpeech: boolean; documentScanner: boolean }>;
  startSpeech(options: { language: string; purpose: SpeechPurpose }): Promise<{ started: boolean; onDevice: boolean }>;
  stopSpeech(): Promise<void>;
  cancelSpeech(): Promise<void>;
  scanDocument(options: { pageLimit: number }): Promise<ScanResult>;
  addListener(eventName: 'speechPartial' | 'speechFinal', listener: (event: SpeechEvent) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'speechError', listener: (event: { message: string; code?: number }) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'speechEnded', listener: () => void): Promise<PluginListenerHandle>;
}

const NativeClinicalAssist = registerPlugin<ClinicalAssistNativePlugin>('ClinicalAssist');

export async function getClinicalAssistCapabilities() {
  if (!Capacitor.isNativePlatform()) {
    return { onDeviceSpeech: false, documentScanner: false };
  }
  return NativeClinicalAssist.getCapabilities();
}

export async function startNativeSpeech(
  purpose: SpeechPurpose,
  handlers: { onPartial?: (text: string) => void; onFinal: (text: string, confidence?: number) => void; onError: (message: string) => void; onEnd: () => void }
) {
  if (!Capacitor.isNativePlatform()) throw new Error('Native speech is only available in the Android app.');

  let cleaned = false;
  let ended = false;
  let resolveEnded: (() => void) | undefined;
  let terminalError: string | undefined;
  const endedPromise = new Promise<void>(resolve => { resolveEnded = resolve; });
  const listeners: PluginListenerHandle[] = [];

  const markEnded = () => {
    if (ended) return;
    ended = true;
    resolveEnded?.();
  };

  const cleanup = async () => {
    if (cleaned) return;
    cleaned = true;
    await Promise.allSettled(listeners.map(listener => listener.remove()));
  };

  try {
    listeners.push(await NativeClinicalAssist.addListener('speechPartial', event => handlers.onPartial?.(event.transcript)));
    listeners.push(await NativeClinicalAssist.addListener('speechFinal', event => handlers.onFinal(event.transcript, event.confidence)));
    listeners.push(await NativeClinicalAssist.addListener('speechError', event => {
      terminalError = event.message;
      handlers.onError(event.message);
      markEnded();
    }));
    listeners.push(await NativeClinicalAssist.addListener('speechEnded', () => {
      handlers.onEnd();
      markEnded();
    }));

    const started = await NativeClinicalAssist.startSpeech({ language: 'en-US', purpose });
    if (!started.started || !started.onDevice) {
      try { await NativeClinicalAssist.cancelSpeech(); } catch { /* best-effort teardown */ }
      await cleanup();
      throw new Error('On-device speech recognition is unavailable. Type the response instead; network speech fallback is disabled for PHI safety.');
    }
    if (ended) {
      await NativeClinicalAssist.cancelSpeech().catch(() => undefined);
      await cleanup();
      if (terminalError) throw new Error(terminalError);
      return { onDevice: true, active: false, stop: async () => undefined, cleanup: async () => undefined };
    }

    return {
      onDevice: true,
      active: true,
      stop: async () => {
        // Android's stopListening() returns before onResults/onEndOfSpeech. Keep JS
        // listeners alive briefly so the final transcript is not lost when the user taps Stop.
        try {
          await NativeClinicalAssist.stopSpeech();
          await Promise.race([
            endedPromise,
            new Promise<void>(resolve => setTimeout(resolve, 3_000))
          ]);
          if (!ended) await NativeClinicalAssist.cancelSpeech().catch(() => undefined);
        } finally {
          await cleanup();
        }
      },
      cleanup: async () => {
        await NativeClinicalAssist.cancelSpeech().catch(() => undefined);
        await cleanup();
      }
    };
  } catch (error) {
    markEnded();
    await cleanup();
    throw error;
  }
}

export async function scanDocument(pageLimit = 10): Promise<ScanResult> {
  if (!Capacitor.isNativePlatform()) throw new Error('Document scanning is available in the Android app.');
  const numericLimit = Number(pageLimit);
  const safeLimit = Number.isFinite(numericLimit) ? Math.max(1, Math.min(Math.trunc(numericLimit), 25)) : 10;
  const result = await NativeClinicalAssist.scanDocument({ pageLimit: safeLimit });
  if (!result || typeof result.ocrText !== 'string') throw new Error('Document scanner returned an invalid OCR result.');
  const pageCount = Number(result.pageCount);
  const failedPageCount = result.failedPageCount === undefined ? 0 : Number(result.failedPageCount);
  if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > safeLimit) throw new Error('Document scanner returned an invalid page count.');
  if (!Number.isInteger(failedPageCount) || failedPageCount < 0 || failedPageCount > pageCount) throw new Error('Document scanner returned an invalid OCR failure count.');
  if (!result.ocrText.trim() && failedPageCount >= pageCount) throw new Error('OCR did not return readable text from any scanned page.');
  return {
    ocrText: result.ocrText.slice(0, 100_000),
    pdfUri: typeof result.pdfUri === 'string' ? result.pdfUri.slice(0, 4096) : undefined,
    pageCount,
    failedPageCount,
    ocrTruncated: result.ocrTruncated === true || result.ocrText.length > 100_000
  };
}
