import type { Discipline } from '../../types/domain';

export type AssessmentInputType = 'yes-no' | 'text' | 'number' | 'select' | 'multi-select';

export interface AssessmentFieldDefinition {
  id: string;
  label: string;
  help?: string;
  type: AssessmentInputType;
  options?: string[];
  required?: boolean;
  disciplines?: Discipline[];
  alertWhen?: string[];
}

export interface AssessmentSectionDefinition {
  id: string;
  title: string;
  description?: string;
  fields: AssessmentFieldDefinition[];
}

const allClinical: Discipline[] = ['RN', 'PT', 'OT', 'SLP', 'Aide', 'MSW'];

export const commonAssessmentSections: AssessmentSectionDefinition[] = [
  {
    id: 'general', title: 'General status', description: 'Reusable visit-level observations. Only document what was actually assessed.', fields: [
      { id: 'mental-status', label: 'Mental status / orientation', type: 'select', options: ['Alert/oriented', 'Baseline cognitive impairment', 'Acute change/confusion', 'Unable to assess'], required: true },
      { id: 'pain-impact', label: 'Does pain interfere with activity or care today?', type: 'yes-no' },
      { id: 'falls-since-last', label: 'Fall since last agency contact?', type: 'yes-no', alertWhen: ['Yes'] },
      { id: 'hospital-er-since-last', label: 'ER/hospital/urgent-care visit since last agency contact?', type: 'yes-no', alertWhen: ['Yes'] },
      { id: 'new-symptom-change', label: 'New or worsening symptom/change from baseline?', type: 'yes-no', alertWhen: ['Yes'] },
      { id: 'change-detail', label: 'Change/fall/hospitalization details', type: 'text' }
    ]
  },
  {
    id: 'safety', title: 'Safety & support', fields: [
      { id: 'caregiver-available', label: 'Caregiver/support available as expected?', type: 'yes-no' },
      { id: 'home-safety-concern', label: 'New home-safety concern identified?', type: 'yes-no', alertWhen: ['Yes'] },
      { id: 'safety-detail', label: 'Safety/support details', type: 'text' }
    ]
  }
];

export const disciplineAssessmentSections: Record<Discipline, AssessmentSectionDefinition[]> = {
  RN: [
    {
      id: 'cardiopulmonary', title: 'Cardiopulmonary', fields: [
        { id: 'dyspnea', label: 'Dyspnea', type: 'select', options: ['None', 'With exertion', 'At rest', 'Unable to assess'] },
        { id: 'lung-sounds', label: 'Lung sounds', type: 'select', options: ['Clear', 'Diminished', 'Crackles', 'Wheeze', 'Other', 'Not assessed'] },
        { id: 'edema', label: 'Edema', type: 'select', options: ['None', 'Trace', '1+', '2+', '3+', '4+'] },
        { id: 'edema-location', label: 'Edema location/details', type: 'text' },
        { id: 'chest-pain', label: 'Chest pain reported today?', type: 'yes-no', alertWhen: ['Yes'] }
      ]
    },
    {
      id: 'medication-management', title: 'Medication management', fields: [
        { id: 'med-discrepancy', label: 'Medication discrepancy/problem identified?', type: 'yes-no', alertWhen: ['Yes'] },
        { id: 'med-adherence', label: 'Medication adherence', type: 'select', options: ['No concern identified', 'Needs reinforcement', 'Unable to determine'] },
        { id: 'med-detail', label: 'Medication findings/actions', type: 'text' }
      ]
    },
    {
      id: 'integumentary', title: 'Skin / wounds', fields: [
        { id: 'skin-concern', label: 'New skin/wound concern?', type: 'yes-no', alertWhen: ['Yes'] },
        { id: 'wound-order-followed', label: 'Wound-care order followed when applicable?', type: 'select', options: ['Yes', 'No', 'Not applicable'] },
        { id: 'skin-detail', label: 'Skin/wound details', type: 'text' }
      ]
    }
  ],
  PT: [
    {
      id: 'mobility', title: 'Mobility & function', fields: [
        { id: 'transfer-assist', label: 'Transfer assistance', type: 'select', options: ['Independent', 'Supervision', 'Contact guard', 'Min assist', 'Mod assist', 'Max assist', 'Dependent'] },
        { id: 'gait-device', label: 'Primary gait device', type: 'select', options: ['None', 'Cane', 'Rolling walker', 'Standard walker', 'Wheelchair', 'Other'] },
        { id: 'gait-distance', label: 'Ambulation distance (ft)', type: 'number' },
        { id: 'balance-concern', label: 'Loss of balance / significant instability today?', type: 'yes-no', alertWhen: ['Yes'] },
        { id: 'therapy-response', label: 'Response/tolerance to therapeutic activity', type: 'text' }
      ]
    }
  ],
  OT: [
    {
      id: 'adl', title: 'ADL / upper-extremity function', fields: [
        { id: 'adl-change', label: 'Change in ADL performance since prior visit?', type: 'select', options: ['Improved', 'Stable', 'Declined', 'Unable to assess'] },
        { id: 'ue-function', label: 'Upper-extremity functional limitation', type: 'text' },
        { id: 'adaptive-equipment', label: 'Adaptive equipment / home modification need', type: 'text' }
      ]
    }
  ],
  SLP: [
    {
      id: 'speech-swallow', title: 'Speech / cognition / swallowing', fields: [
        { id: 'communication-change', label: 'Communication/cognitive change?', type: 'select', options: ['Improved', 'Stable', 'Declined', 'Unable to assess'] },
        { id: 'swallow-concern', label: 'Swallowing/aspiration concern?', type: 'yes-no', alertWhen: ['Yes'] },
        { id: 'slp-response', label: 'Treatment response / strategies trained', type: 'text' }
      ]
    }
  ],
  Aide: [
    {
      id: 'aide-care', title: 'Aide care observations', fields: [
        { id: 'care-completed', label: 'Ordered care completed?', type: 'yes-no' },
        { id: 'change-reported', label: 'Change/concern requiring clinician notification?', type: 'yes-no', alertWhen: ['Yes'] },
        { id: 'aide-detail', label: 'Observed change / care details', type: 'text' }
      ]
    }
  ],
  MSW: [
    {
      id: 'psychosocial', title: 'Psychosocial / resource needs', fields: [
        { id: 'resource-barrier', label: 'Resource/access barrier identified?', type: 'yes-no', alertWhen: ['Yes'] },
        { id: 'caregiver-strain', label: 'Caregiver strain/concern?', type: 'yes-no', alertWhen: ['Yes'] },
        { id: 'msw-detail', label: 'Interventions/resources/follow-up', type: 'text' }
      ]
    }
  ]
};

export function assessmentSectionsForDiscipline(discipline: Discipline) {
  return [...commonAssessmentSections, ...(disciplineAssessmentSections[discipline] ?? [])]
    .map(section => ({ ...section, fields: section.fields.filter(field => !field.disciplines || field.disciplines.some(d => allClinical.includes(d))) }));
}
