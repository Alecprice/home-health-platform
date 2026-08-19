import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useWorkflow } from '../workflow/WorkflowContext';
import { db } from '../offline/db';

export function AppShell() {
  const { hasStep } = useWorkflow();
  const [online, setOnline] = useState(() => navigator.onLine);
  const [storageReady, setStorageReady] = useState<boolean | null>(null);
  const showDemoTools = import.meta.env.VITE_DEMO_TOOLS === 'true';

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    void db.open().then(() => setStorageReady(true)).catch(() => setStorageReady(false));
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand-mark">HC</div><div className="brand-copy"><strong>Home Health</strong><span>Clinical</span></div><nav><NavLink to="/">Today</NavLink><NavLink to="/patients">Patients</NavLink>{hasStep('field-work') && <NavLink to="/field-work">Field Work</NavLink>}{showDemoTools && <NavLink to="/assist">Assist test</NavLink>}{showDemoTools && <NavLink to="/workflow-lab">Workflow Lab</NavLink>}{showDemoTools && <NavLink to="/qa">QA Review</NavLink>}</nav><div className="sidebar-footer"><span className="status-dot" /><div><strong>Demo workspace</strong><span>Synthetic data only</span></div></div></aside>
    <main className="main-content"><header className="topbar"><div><span className="mobile-brand">Home Health Clinical</span></div><div className="topbar-actions"><span className={`online-pill ${online ? '' : 'warning'}`}>{online ? '● Network online' : '● Network offline'}</span><span className={`online-pill ${storageReady === false ? 'warning' : ''}`}>{storageReady === null ? 'Checking storage…' : storageReady ? 'Device storage ready' : 'Storage unavailable'}</span><div className="avatar" aria-label="Demo clinician, RN">RN</div></div></header><Outlet /></main>
  </div>;
}
