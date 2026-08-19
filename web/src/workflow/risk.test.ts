import { describe, expect, it } from 'vitest';
import { analyzeWorkflowRisks } from './risk';
import { recommendedWorkflow } from './config';

describe('workflow safety analysis', () => {
  it('keeps the recommended workflow free of known ordering risks', () => {
    expect(analyzeWorkflowRisks(recommendedWorkflow.steps)).toEqual([]);
  });
  it('flags sign-before-checkout and reversed EVV', () => {
    const risks = analyzeWorkflowRisks(['patient-review', 'evv-check-out', 'assessment', 'review-sign', 'evv-check-in']);
    expect(risks.map(r => r.id)).toContain('checkout-before-checkin');
    expect(risks.map(r => r.id)).toContain('sign-before-checkout');
  });
});
