import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { recommendedWorkflow, workflowPresets, workflowSteps, type WorkflowPreset, type WorkflowStepId } from './config';
import {
  MAX_WORKFLOW_HISTORY,
  WORKFLOW_STORAGE_KEY,
  normalizeWorkflowState,
  type StoredWorkflowState,
  type WorkflowSnapshot
} from './state';
import { createUuid } from '../utils/id';

interface WorkflowContextValue {
  preset: WorkflowPreset;
  steps: WorkflowStepId[];
  history: WorkflowSnapshot[];
  storageWarning: string;
  selectPreset: (presetId: string) => void;
  toggleStep: (stepId: WorkflowStepId) => void;
  moveStep: (stepId: WorkflowStepId, direction: -1 | 1) => void;
  restoreRecommended: () => void;
  restoreSnapshot: (snapshotId: string) => void;
  hasStep: (stepId: WorkflowStepId) => boolean;
}

function readStoredState(): StoredWorkflowState {
  try {
    const raw = localStorage.getItem(WORKFLOW_STORAGE_KEY);
    return raw ? normalizeWorkflowState(JSON.parse(raw)) : normalizeWorkflowState(null);
  } catch {
    return normalizeWorkflowState(null);
  }
}

function resolved(state: StoredWorkflowState) {
  const preset = workflowPresets.find(item => item.id === state.selectedPresetId) ?? recommendedWorkflow;
  return { preset, steps: state.customSteps ?? preset.steps, history: state.history ?? [] };
}

function sameSteps(a?: WorkflowStepId[], b?: WorkflowStepId[]) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

const WorkflowContext = createContext<WorkflowContextValue | null>(null);

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoredWorkflowState>(() => readStoredState());
  const [storageWarning, setStorageWarning] = useState('');
  const current = resolved(state);

  // Persist after React commits the state. Keeping localStorage writes and warning
  // updates out of the state-updater function makes rapid taps deterministic and
  // keeps React StrictMode's double-invocation checks from duplicating side effects.
  useEffect(() => {
    try {
      localStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(state));
      setStorageWarning('');
    } catch {
      setStorageWarning('Workflow changes are active for this session but could not be persisted on this device.');
    }
  }, [state]);

  const changeState = (transform: (current: StoredWorkflowState, steps: WorkflowStepId[], preset: WorkflowPreset, history: WorkflowSnapshot[]) => StoredWorkflowState) => {
    // Generate action metadata once outside the updater. The captured values stay
    // stable if React invokes the updater more than once in development StrictMode.
    const snapshotMeta = { id: createUuid(), savedAt: new Date().toISOString() };
    setState(previous => {
      const before = resolved(previous);
      const requested = normalizeWorkflowState(transform(previous, before.steps, before.preset, before.history));
      const requestedResolved = resolved(requested);
      if (requested.selectedPresetId === previous.selectedPresetId && sameSteps(requestedResolved.steps, before.steps)) return previous;

      const snapshot: WorkflowSnapshot = {
        ...snapshotMeta,
        selectedPresetId: before.preset.id,
        steps: [...before.steps]
      };
      return normalizeWorkflowState({
        ...requested,
        history: [snapshot, ...before.history].slice(0, MAX_WORKFLOW_HISTORY)
      });
    });
  };

  const value = useMemo<WorkflowContextValue>(() => ({
    preset: current.preset,
    steps: current.steps,
    history: current.history,
    storageWarning,
    selectPreset(presetId) {
      const nextPreset = workflowPresets.find(item => item.id === presetId) ?? recommendedWorkflow;
      changeState(() => ({ selectedPresetId: nextPreset.id }));
    },
    toggleStep(stepId) {
      if (!workflowSteps[stepId].optional) return;
      changeState((_state, steps, preset) => ({
        selectedPresetId: preset.id,
        customSteps: steps.includes(stepId) ? steps.filter(item => item !== stepId) : [...steps, stepId]
      }));
    },
    moveStep(stepId, direction) {
      changeState((_state, steps, preset) => {
        const index = steps.indexOf(stepId);
        const nextIndex = index + direction;
        if (index < 0 || nextIndex < 0 || nextIndex >= steps.length) return { selectedPresetId: preset.id, customSteps: [...steps] };
        const next = [...steps];
        [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
        return { selectedPresetId: preset.id, customSteps: next };
      });
    },
    restoreRecommended() {
      changeState(() => ({ selectedPresetId: recommendedWorkflow.id }));
    },
    restoreSnapshot(snapshotId) {
      changeState((_state, _steps, _preset, history) => {
        const snapshot = history.find(item => item.id === snapshotId);
        return snapshot
          ? { selectedPresetId: snapshot.selectedPresetId, customSteps: [...snapshot.steps] }
          : _state;
      });
    },
    hasStep(stepId) { return current.steps.includes(stepId); }
  }), [current.preset, current.steps, current.history, storageWarning]);

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
}

export function useWorkflow() {
  const value = useContext(WorkflowContext);
  if (!value) throw new Error('useWorkflow must be used inside WorkflowProvider');
  return value;
}
