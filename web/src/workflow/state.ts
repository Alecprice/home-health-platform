import { recommendedWorkflow, workflowPresets, workflowSteps, type WorkflowStepId } from './config';

export const MAX_WORKFLOW_HISTORY = 20;
export const WORKFLOW_STORAGE_KEY = 'home-health-workflow-config-v2';

export interface WorkflowSnapshot {
  id: string;
  savedAt: string;
  selectedPresetId: string;
  steps: WorkflowStepId[];
}

export interface StoredWorkflowState {
  selectedPresetId: string;
  customSteps?: WorkflowStepId[];
  history?: WorkflowSnapshot[];
}

const validStepIds = new Set(Object.keys(workflowSteps) as WorkflowStepId[]);
const coreStepIds = (Object.keys(workflowSteps) as WorkflowStepId[]).filter(id => !workflowSteps[id].optional);

export function normalizeStepList(value: unknown): WorkflowStepId[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result: WorkflowStepId[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || !validStepIds.has(item as WorkflowStepId)) continue;
    const step = item as WorkflowStepId;
    if (!result.includes(step)) result.push(step);
  }
  const recommendedOrder = new Map(recommendedWorkflow.steps.map((step, index) => [step, index]));
  for (const core of coreStepIds) {
    if (result.includes(core)) continue;
    const coreOrder = recommendedOrder.get(core) ?? Number.MAX_SAFE_INTEGER;
    const insertAt = result.findIndex(step => (recommendedOrder.get(step) ?? Number.MAX_SAFE_INTEGER) > coreOrder);
    if (insertAt === -1) result.push(core); else result.splice(insertAt, 0, core);
  }
  return result.length ? result : undefined;
}

export function normalizeWorkflowState(value: unknown): StoredWorkflowState {
  const input = value && typeof value === 'object' ? value as Partial<StoredWorkflowState> : {};
  const preset = workflowPresets.find(item => item.id === input.selectedPresetId) ?? recommendedWorkflow;
  const customSteps = normalizeStepList(input.customSteps);
  const history = Array.isArray(input.history)
    ? input.history.flatMap(item => {
        if (!item || typeof item !== 'object') return [];
        const raw = item as Partial<WorkflowSnapshot>;
        const steps = normalizeStepList(raw.steps);
        if (!steps || typeof raw.id !== 'string' || typeof raw.savedAt !== 'string') return [];
        const historyPreset = workflowPresets.find(p => p.id === raw.selectedPresetId) ?? recommendedWorkflow;
        return [{ id: raw.id, savedAt: raw.savedAt, selectedPresetId: historyPreset.id, steps }];
      }).slice(0, MAX_WORKFLOW_HISTORY)
    : [];
  return { selectedPresetId: preset.id, customSteps, history };
}
