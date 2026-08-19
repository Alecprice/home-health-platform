import { useEffect, useState } from 'react';
import { captureEvvPoint } from '../../native/evv';
import { db } from '../../offline/db';
import type { EvvCapture } from '../../types/domain';

type Props = {
  visitId: string;
  kind: EvvCapture['kind'];
  blockedReason?: string;
  onLatestChange?: (capture: EvvCapture | null) => void;
};
const ACCURACY_WARNING_METERS = 100;

export function EvvCaptureCard({ visitId, kind, blockedReason, onLatestChange }: Props) {
  const [capture, setCapture] = useState<EvvCapture | null>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void db.evvCaptures.where('[visitId+kind]').equals([visitId, kind]).sortBy('capturedAt')
      .then(rows => {
        if (cancelled) return;
        const latest = rows.at(-1) ?? null;
        setCapture(latest);
        onLatestChange?.(latest);
      })
      .catch(() => { if (!cancelled) setStatus('Unable to read prior EVV captures from device storage.'); });
    return () => { cancelled = true; };
  }, [visitId, kind, onLatestChange]);

  const captureNow = async () => {
    if (busy || blockedReason) return;
    setBusy(true);
    setStatus('Getting a precise location fix…');
    try {
      const row = await captureEvvPoint(visitId, kind);
      await db.evvCaptures.add(row);
      setCapture(current => !current || row.capturedAt >= current.capturedAt ? row : current);
      onLatestChange?.(row);
      setStatus(row.accuracyMeters > ACCURACY_WARNING_METERS
        ? `Saved, but location accuracy is ±${Math.round(row.accuracyMeters)} m. Recapture outdoors/near a window if agency policy requires a tighter fix.`
        : 'Saved on device and queued for server sync.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to capture location.');
    } finally { setBusy(false); }
  };

  const title = kind === 'check-in' ? 'EVV check-in' : 'EVV check-out';
  return (
    <section className="panel compact-panel evv-card">
      <div className="panel-heading"><div><h2>{title}</h2><p className="helper">Captures timestamp, coordinates, and device-reported accuracy. Recaptures remain separate events.</p></div><span className={`badge ${capture ? 'safe' : ''}`}>{capture ? 'Captured' : 'Pending'}</span></div>
      {capture && <div className="evv-result"><strong>{new Date(capture.capturedAt).toLocaleString()}</strong><span>{capture.latitude.toFixed(5)}, {capture.longitude.toFixed(5)}</span><span>Accuracy ±{Math.round(capture.accuracyMeters)} m · {capture.source}</span><span>{capture.syncStatus === 'synced' ? 'Synced' : 'Pending sync'}</span></div>}
      {blockedReason && <p className="validation-callout" role="alert"><strong>Not ready yet</strong><span>{blockedReason}</span></p>}
      <div className="button-row"><button className="button primary" type="button" disabled={busy || Boolean(blockedReason)} onClick={() => void captureNow()}>{busy ? 'Capturing…' : capture ? 'Recapture location' : `Capture ${kind}`}</button></div>
      {status && <p className="helper" role="status">{status}</p>}
    </section>
  );
}
