import { useWorkflow } from '../workflow/WorkflowContext';
import { workflowSteps } from '../workflow/config';

export function WorkflowRail() {
  const { steps, preset } = useWorkflow();
  const showDemoTools = import.meta.env.VITE_DEMO_TOOLS === 'true';
  return (
    <section className="workflow-rail" aria-label="Current visit workflow">
      <div className="workflow-rail-heading">
        <div><span>Visit steps</span><strong>{showDemoTools ? preset.name : 'Complete in order when applicable'}</strong></div>
        {showDemoTools && <small>Test configuration · v{preset.version}</small>}
      </div>
      <div className="workflow-steps">
        {steps.map((stepId, index) => (
          <div className="workflow-step" key={stepId}>
            <span className="workflow-number">{index + 1}</span>
            <span>{workflowSteps[stepId].shortLabel}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
