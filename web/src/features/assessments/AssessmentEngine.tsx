import type { AssessmentResponse, AssessmentResponseValue, Discipline } from '../../types/domain';
import { assessmentSectionsForDiscipline } from './templates';

interface Props {
  discipline: Discipline;
  responses: AssessmentResponse[];
  onChange: (responses: AssessmentResponse[]) => void;
}

function currentValue(responses: AssessmentResponse[], fieldId: string): AssessmentResponseValue {
  return responses.find(row => row.fieldId === fieldId)?.value ?? '';
}

export function AssessmentEngine({ discipline, responses, onChange }: Props) {
  const sections = assessmentSectionsForDiscipline(discipline);
  const setValue = (fieldId: string, value: AssessmentResponseValue) => {
    const next = responses.filter(row => row.fieldId !== fieldId);
    if (value !== '' && value !== null) next.push({ fieldId, value, updatedAt: new Date().toISOString() });
    onChange(next);
  };

  return <div className="assessment-engine">
    {sections.map(section => <section className="assessment-section" key={section.id}>
      <div className="panel-heading"><div><h3>{section.title}</h3>{section.description && <p className="helper">{section.description}</p>}</div></div>
      <div className="assessment-field-grid">
        {section.fields.map(field => {
          const value = currentValue(responses, field.id);
          const valueString = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
          const alert = field.alertWhen?.includes(valueString);
          return <label className={`assessment-field ${alert ? 'clinical-alert-field' : ''}`} key={field.id}>
            <span>{field.label}{field.required && <strong className="required-marker"> Required</strong>}</span>
            {field.help && <small>{field.help}</small>}
            {field.type === 'yes-no' && <select value={valueString} onChange={e => setValue(field.id, e.target.value)}><option value="">Select…</option><option>No</option><option>Yes</option><option>Unable to assess</option></select>}
            {field.type === 'select' && <select value={valueString} onChange={e => setValue(field.id, e.target.value)}><option value="">Select…</option>{field.options?.map(option => <option key={option}>{option}</option>)}</select>}
            {field.type === 'number' && <input inputMode="decimal" type="number" value={valueString} onChange={e => setValue(field.id, e.target.value === '' ? '' : Number(e.target.value))} />}
            {field.type === 'text' && <textarea value={valueString} onChange={e => setValue(field.id, e.target.value.slice(0, 5000))} placeholder="Document only what was assessed or reported." />}
          </label>;
        })}
      </div>
    </section>)}
  </div>;
}
