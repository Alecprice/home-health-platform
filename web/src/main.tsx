import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { WorkflowProvider } from './workflow/WorkflowContext';
import { initializeNativeRecovery } from './native/recovery';
import './styles.css';

async function bootstrap() {
  try { await initializeNativeRecovery(); }
  catch { console.error('Native recovery listener unavailable.'); }

  const root = document.getElementById('root');
  if (!root) throw new Error('Application root element is missing.');
  createRoot(root).render(
    <StrictMode>
      <WorkflowProvider>
        <RouterProvider router={router} />
      </WorkflowProvider>
    </StrictMode>
  );
}

void bootstrap();
