import type { WorkflowStepId } from './config';

export interface WorkflowRisk { id: string; message: string; }

export function analyzeWorkflowRisks(steps: WorkflowStepId[]): WorkflowRisk[] {
  const index = (id: WorkflowStepId) => steps.indexOf(id);
  const risks: WorkflowRisk[] = [];
  const checkIn = index('evv-check-in');
  const checkOut = index('evv-check-out');
  const sign = index('review-sign');
  const review = index('patient-review');
  const assessment = index('assessment');
  const context = index('clinical-context');

  if (review > assessment) risks.push({ id: 'review-after-chart', message: 'Patient review occurs after charting. This increases wrong-patient documentation risk.' });
  if (context >= 0 && assessment >= 0 && context > assessment) risks.push({ id: 'context-after-chart', message: 'Clinical context review occurs after charting. Review medication/orders/prior context before documenting today.' });
  if (checkIn >= 0 && assessment >= 0 && checkIn > assessment) risks.push({ id: 'checkin-after-chart', message: 'EVV check-in occurs after assessment/charting. Consider capturing visit start before documentation.' });
  if (checkIn >= 0 && checkOut >= 0 && checkOut < checkIn) risks.push({ id: 'checkout-before-checkin', message: 'EVV check-out is ordered before check-in.' });
  if (checkOut >= 0 && sign >= 0 && sign < checkOut) risks.push({ id: 'sign-before-checkout', message: 'Review/sign is ordered before EVV check-out. The note may appear finalized before the visit has ended.' });
  return risks;
}
