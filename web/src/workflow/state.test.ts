import { describe, expect, it } from 'vitest';
import { MAX_WORKFLOW_HISTORY, normalizeStepList, normalizeWorkflowState } from './state';

const core = ['patient-review', 'assessment', 'review-sign'];

describe('workflow state hardening', () => {
  it('drops unknown and duplicate steps while restoring missing core steps', () => {
    const result = normalizeStepList(['assessment', 'bogus', 'assessment', 'clinical-assist']);
    expect(result).toEqual(['patient-review', 'assessment', 'clinical-assist', 'review-sign']);
    for (const step of core) expect(result).toContain(step);
  });

  it('falls back to the recommended preset for corrupt preset ids', () => {
    const result = normalizeWorkflowState({ selectedPresetId: 'deleted-preset' });
    expect(result.selectedPresetId).toBe('recommended');
  });

  it('limits and normalizes workflow history', () => {
    const history = Array.from({ length: MAX_WORKFLOW_HISTORY + 7 }, (_, index) => ({
      id: `h-${index}`,
      savedAt: '2026-08-18T00:00:00.000Z',
      selectedPresetId: 'bad',
      steps: ['assessment']
    }));
    const result = normalizeWorkflowState({ selectedPresetId: 'recommended', history });
    expect(result.history).toHaveLength(MAX_WORKFLOW_HISTORY);
    expect(result.history?.[0].selectedPresetId).toBe('recommended');
    expect(result.history?.[0].steps).toEqual(['patient-review', 'assessment', 'review-sign']);
  });
});
