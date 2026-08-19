import { Camera, type MediaResult } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { createUuid } from '../utils/id';

export interface ReceiptCaptureResult {
  name: string;
  uri?: string;
  previewUrl?: string;
  persistent: boolean;
}

function safeFormat(result: Partial<MediaResult>): string {
  const format = result.metadata?.format?.toLowerCase();
  return format === 'png' ? 'png' : 'jpg';
}

export async function persistReceiptMedia(result: Partial<MediaResult>): Promise<ReceiptCaptureResult> {
  const extension = safeFormat(result);
  const name = `receipt-${new Date().toISOString().replace(/[:.]/g, '-')}-${createUuid().slice(0, 8)}.${extension}`;
  if (!Capacitor.isNativePlatform() || !result.uri) {
    return { name, uri: result.uri, previewUrl: result.webPath, persistent: false };
  }

  try {
    try {
      await Filesystem.mkdir({ path: 'receipts', directory: Directory.Data, recursive: true });
    } catch {
      // Existing directory is fine; copy below is the persistence check.
    }
    const copied = await Filesystem.copy({
      from: result.uri,
      to: `receipts/${name}`,
      toDirectory: Directory.Data
    });
    return { name, uri: copied.uri, previewUrl: Capacitor.convertFileSrc(copied.uri), persistent: true };
  } catch {
    return { name, uri: result.uri, previewUrl: result.webPath, persistent: false };
  }
}

export async function captureReceiptPhoto(): Promise<ReceiptCaptureResult> {
  const result = await Camera.takePhoto({
    quality: 82,
    targetWidth: 1800,
    targetHeight: 1800,
    correctOrientation: true,
    saveToGallery: false,
    includeMetadata: false
  });
  return persistReceiptMedia(result);
}
