import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { startNativeSpeech, type SpeechPurpose } from '../../native/clinicalAssist';

type BrowserSpeechRecognition = {
  continuous: boolean; interimResults: boolean; lang: string;
  start: () => void; stop: () => void; abort?: () => void;
  onresult: ((event: any) => void) | null; onerror: ((event: any) => void) | null; onend: (() => void) | null;
};

type Props = { label: string; purpose: SpeechPurpose; existingText: string; onTranscript: (text: string) => void; onPatientAcknowledged?: () => void };

function combine(base: string, transcript: string) {
  const left = base.trimEnd();
  const right = transcript.trim();
  if (!right) return base;
  return left ? `${left}${/[.!?]$/.test(left) ? ' ' : '. '}${right}` : right;
}

export function SpeechCapture({ label, purpose, existingText, onTranscript, onPatientAcknowledged }: Props) {
  const [listening, setListening] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [message, setMessage] = useState('');
  const [patientAcknowledged, setPatientAcknowledged] = useState(false);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const nativeStopRef = useRef<(() => Promise<void>) | null>(null);
  const nativeCleanupRef = useRef<(() => Promise<void>) | null>(null);
  const baseTextRef = useRef('');
  const operationRef = useRef(false);
  const mountedRef = useRef(true);
  const generationRef = useRef(0);

  const cleanupNative = async () => {
    const cleanup = nativeCleanupRef.current;
    nativeCleanupRef.current = null;
    nativeStopRef.current = null;
    if (cleanup) await cleanup();
  };

  const stop = async () => {
    if (operationRef.current) return;
    operationRef.current = true;
    setTransitioning(true);
    try {
      try { recognitionRef.current?.stop(); } catch { /* already stopped */ }
      recognitionRef.current = null;
      const nativeStop = nativeStopRef.current;
      if (nativeStop) await nativeStop(); else await cleanupNative();
    } finally {
      nativeStopRef.current = null;
      nativeCleanupRef.current = null;
      operationRef.current = false;
      if (mountedRef.current) {
        setListening(false);
        setTransitioning(false);
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      try { recognitionRef.current?.abort?.(); } catch { /* ignore teardown */ }
      recognitionRef.current = null;
      void nativeStopRef.current?.().catch(() => undefined);
      void nativeCleanupRef.current?.().catch(() => undefined);
      nativeStopRef.current = null;
      nativeCleanupRef.current = null;
    };
  }, []);

  const startBrowserSpeech = (generation: number) => {
    if (import.meta.env.VITE_DEMO_MODE !== 'true') {
      setMessage('Browser speech is disabled outside synthetic demo mode. Use the Android on-device recognizer or type the response.');
      return false;
    }
    const ctor = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!ctor) { setMessage('Speech recognition is not available in this browser. Use the Android app or type the response.'); return false; }
    const recognition: BrowserSpeechRecognition = new ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    baseTextRef.current = existingText;
    recognition.onresult = (event: any) => {
      if (!mountedRef.current || generationRef.current !== generation) return;
      const transcript = Array.from(event.results).map((result: any) => result[0]?.transcript ?? '').join(' ').trim();
      if (transcript) onTranscript(combine(baseTextRef.current, transcript));
    };
    recognition.onerror = () => {
      if (!mountedRef.current || generationRef.current !== generation) return;
      setListening(false);
      setMessage('Browser demo speech recognition stopped with an error. Do not use browser speech for PHI.');
    };
    recognition.onend = () => {
      if (!mountedRef.current || generationRef.current !== generation) return;
      recognitionRef.current = null;
      setListening(false);
    };
    recognitionRef.current = recognition;
    setListening(true);
    setMessage('Browser speech is demo-only and may use a network service. Real PHI should use the Android on-device path.');
    recognition.start();
    return true;
  };

  const start = async () => {
    if (operationRef.current || listening) return;
    if (purpose === 'patient-response' && !patientAcknowledged) {
      setMessage('Confirm patient/representative acknowledgement before starting patient-response transcription.');
      return;
    }
    if (purpose === 'patient-response') onPatientAcknowledged?.();

    operationRef.current = true;
    setTransitioning(true);
    const generation = ++generationRef.current;
    baseTextRef.current = existingText;
    try {
      if (!Capacitor.isNativePlatform()) {
        startBrowserSpeech(generation);
        return;
      }

      setMessage('Starting on-device speech recognition…');
      const session = await startNativeSpeech(purpose, {
        onPartial: text => {
          if (mountedRef.current && generationRef.current === generation) onTranscript(combine(baseTextRef.current, text));
        },
        onFinal: (text, confidence) => {
          if (!mountedRef.current || generationRef.current !== generation) return;
          onTranscript(combine(baseTextRef.current, text));
          setMessage(confidence === undefined ? 'Transcription complete.' : `Transcription complete · ${Math.round(confidence * 100)}% recognizer confidence.`);
        },
        onError: error => {
          if (!mountedRef.current || generationRef.current !== generation) return;
          setListening(false);
          setMessage(error);
          void cleanupNative();
        },
        onEnd: () => {
          if (!mountedRef.current || generationRef.current !== generation) return;
          setListening(false);
          void cleanupNative();
        }
      });

      if (!mountedRef.current || generationRef.current !== generation) {
        await session.cleanup();
        return;
      }
      if (!session.active) {
        setListening(false);
        return;
      }
      nativeStopRef.current = session.stop;
      nativeCleanupRef.current = session.cleanup;
      setListening(true);
      setMessage(session.onDevice ? 'On-device speech recognition active.' : 'Speech recognition active.');
    } catch (error) {
      if (mountedRef.current && generationRef.current === generation) {
        setListening(false);
        await cleanupNative();
        setMessage(error instanceof Error ? error.message : 'Unable to start speech recognition.');
      }
    } finally {
      operationRef.current = false;
      if (mountedRef.current && generationRef.current === generation) setTransitioning(false);
    }
  };

  return <div className="speech-capture-block">
    {purpose === 'patient-response' && <label className="acknowledgement-row"><input type="checkbox" checked={patientAcknowledged} disabled={listening || transitioning} onChange={event => setPatientAcknowledged(event.target.checked)} /><span>Patient/authorized representative is aware that speech-to-text transcription is being used for this response.</span></label>}
    <button className={`assist-button ${listening ? 'danger' : ''}`} disabled={transitioning} type="button" onClick={() => void (listening ? stop() : start())}>{listening ? '■ Stop' : '🎙'} {transitioning ? 'Please wait…' : listening ? 'Listening…' : label}</button>
    {message && <small className="speech-status" role="status">{message}</small>}
  </div>;
}
