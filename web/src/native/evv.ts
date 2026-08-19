import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import type { EvvCapture } from '../types/domain';
import { createUuid } from '../utils/id';

function validCoordinate(latitude: number, longitude: number, accuracy: number) {
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
    && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180
    && Number.isFinite(accuracy) && accuracy >= 0;
}

export async function captureEvvPoint(visitId: string, kind: EvvCapture['kind']): Promise<EvvCapture> {
  if (!visitId) throw new Error('A visit is required before EVV can be captured.');

  if (Capacitor.isNativePlatform()) {
    const permission = await Geolocation.checkPermissions();
    if (permission.location !== 'granted') {
      const requested = await Geolocation.requestPermissions({ permissions: ['location'] });
      if (requested.location !== 'granted') throw new Error('Precise location permission is required for EVV capture.');
    }
  }

  const position = await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 30_000,
    maximumAge: 0,
    enableLocationFallback: true
  });

  const { latitude, longitude, accuracy } = position.coords;
  if (!validCoordinate(latitude, longitude, accuracy)) throw new Error('The device returned an invalid location fix. Try again.');

  const now = Date.now();
  const capturedMs = Number(position.timestamp || now);
  if (!Number.isFinite(capturedMs) || capturedMs > now + 60_000 || now - capturedMs > 120_000) {
    throw new Error('The device returned a stale or invalid location timestamp. Recapture the EVV point.');
  }

  return {
    id: createUuid(),
    visitId,
    kind,
    capturedAt: new Date(capturedMs).toISOString(),
    latitude,
    longitude,
    accuracyMeters: accuracy,
    source: Capacitor.isNativePlatform() ? 'device' : 'web',
    syncStatus: 'pending'
  };
}
