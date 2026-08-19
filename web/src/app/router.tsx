import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { PatientsPage } from '../features/patients/PatientsPage';
import { PatientDetailPage } from '../features/patients/PatientDetailPage';
import { ChartPage } from '../features/charting/ChartPage';
import { AssistPage } from '../features/clinical-assist/AssistPage';
import { FieldWorkPage } from '../features/field-work/FieldWorkPage';
import { WorkflowLabPage } from '../features/workflow-lab/WorkflowLabPage';
import { ClinicalContextPage } from '../features/clinical-context/ClinicalContextPage';
import { QAReviewPage } from '../features/qa/QAReviewPage';
import { RouteErrorPage } from '../components/RouteErrorPage';
import { NotFoundPage } from '../components/NotFoundPage';

export const router = createBrowserRouter([{ path: '/', element: <AppShell />, errorElement: <RouteErrorPage />, children: [
  { index: true, element: <DashboardPage /> },
  { path: 'patients', element: <PatientsPage /> },
  { path: 'patients/:patientId', element: <PatientDetailPage /> },
  { path: 'patients/:patientId/clinical-context', element: <ClinicalContextPage /> },
  { path: 'visits/:visitId/chart', element: <ChartPage /> },
  { path: 'assist', element: <AssistPage /> },
  { path: 'field-work', element: <FieldWorkPage /> },
  { path: 'workflow-lab', element: <WorkflowLabPage /> },
  { path: 'qa', element: <QAReviewPage /> },
  { path: '*', element: <NotFoundPage /> }
]}]);
