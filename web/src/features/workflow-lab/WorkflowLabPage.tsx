import { useWorkflow } from '../../workflow/WorkflowContext';
import { workflowPresets, workflowSteps, type WorkflowStepId } from '../../workflow/config';
import { analyzeWorkflowRisks } from '../../workflow/risk';

const allStepIds = Object.keys(workflowSteps) as WorkflowStepId[];

export function WorkflowLabPage() {
  const { preset, steps, history, storageWarning, selectPreset, toggleStep, moveStep, restoreRecommended, restoreSnapshot } = useWorkflow();
  const workflowRisks = analyzeWorkflowRisks(steps);

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Demo configuration</p>
          <h1>Workflow Lab</h1>
          <p>Experiment with visit flow without changing clinical records or database schema.</p>
        </div>
        <button className="button ghost" onClick={restoreRecommended}>Restore recommended</button>
      </div>

      {storageWarning && <section className="info-callout" role="alert"><strong>Workflow persistence warning</strong><p>{storageWarning}</p></section>}
      {workflowRisks.length > 0 && <section className="validation-callout" role="alert"><strong>Workflow safety warning</strong><ul>{workflowRisks.map(risk => <li key={risk.id}>{risk.message}</li>)}</ul></section>}

      <section className="panel">
        <div className="panel-heading"><h2>Presets</h2><span className="badge safe">Easy to revert</span></div>
        <div className="preset-grid">
          {workflowPresets.map(item => (
            <button key={item.id} className={`preset-card ${preset.id === item.id ? 'active' : ''}`} onClick={() => selectPreset(item.id)}>
              <strong>{item.name}</strong>
              <span>{item.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading"><div><h2>Current step order</h2><p className="helper">Optional modules can be hidden. Required clinical steps remain visually identified so we can enforce them later per agency policy.</p></div><span className="badge">{steps.length} steps</span></div>
        <div className="workflow-editor">
          {steps.map((stepId, index) => {
            const step = workflowSteps[stepId];
            return (
              <article className="workflow-editor-row" key={stepId}>
                <span className="workflow-number">{index + 1}</span>
                <div><strong>{step.label}</strong><span>{step.description}</span></div>
                <span className={`badge ${step.optional ? '' : 'safe'}`}>{step.optional ? 'Optional' : 'Core'}</span>
                <div className="row-actions">
                  <button className="icon-button" disabled={index === 0} onClick={() => moveStep(stepId, -1)} aria-label={`Move ${step.label} up`}>↑</button>
                  <button className="icon-button" disabled={index === steps.length - 1} onClick={() => moveStep(stepId, 1)} aria-label={`Move ${step.label} down`}>↓</button>
                  {step.optional && <button className="icon-button danger-text" onClick={() => toggleStep(stepId)}>Hide</button>}
                </div>
              </article>
            );
          })}
        </div>

        <div className="hidden-step-list">
          {allStepIds.filter(stepId => !steps.includes(stepId)).map(stepId => (
            <button className="button ghost" key={stepId} onClick={() => toggleStep(stepId)}>+ {workflowSteps[stepId].label}</button>
          ))}
        </div>
      </section>

      {history.length > 0 && <section className="panel">
        <div className="panel-heading"><div><h2>Recent workflow versions</h2><p className="helper">The demo keeps the last 20 changes locally so user-testing experiments can be rolled back.</p></div><span className="badge">{history.length} saved</span></div>
        <div className="history-list">
          {history.slice(0, 8).map(snapshot => (
            <article className="history-row" key={snapshot.id}>
              <div><strong>{snapshot.steps.map(stepId => workflowSteps[stepId].shortLabel).join(' → ')}</strong><span>{new Date(snapshot.savedAt).toLocaleString()}</span></div>
              <button className="button ghost" onClick={() => restoreSnapshot(snapshot.id)}>Restore</button>
            </article>
          ))}
        </div>
      </section>}

      <section className="info-callout">
        <strong>Why this matters</strong>
        <p>Workflow configuration is stored independently from patient notes. We can test different orders with users, version a winning workflow, restore a previous experiment, or return to the recommended flow without migrating clinical data.</p>
      </section>
    </div>
  );
}
